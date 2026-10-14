from database.db_manager import DatabaseManager
from datetime import datetime, timedelta

class Schedule:
    def __init__(self, schedule_id, med_id, schedule_type, time_value, schedule_date=None, dose_per_intake=1, dose_unit='tablet', frequency='Every day', start_date=None, end_date=None, instructions='', status='ACTIVE', med_name='', strength='', stock=0, stock_unit='tablets', image_path=None):
        self.schedule_id = schedule_id
        self.med_id = med_id
        self.schedule_type = schedule_type
        self.time_value = time_value
        self.schedule_date = schedule_date
        self.dose_per_intake = dose_per_intake or 1
        self.dose_unit = dose_unit or 'tablet'
        self.frequency = frequency or 'Every day'
        self.start_date = start_date
        self.end_date = end_date
        self.instructions = instructions or ''
        self.status = status or 'ACTIVE'
        self.med_name = med_name
        self.strength = strength
        self.stock = stock
        self.stock_unit = stock_unit or 'tablets'
        self.image_path = image_path

def _parse_time_sort_key(time_val):
    if not time_val:
        return 9999
    val_str = str(time_val).strip()
    val_lower = val_str.lower()
    if 'am' in val_lower or 'pm' in val_lower:
        try:
            parts = val_lower.replace('am', '').replace('pm', '').strip().split(':')
            h = int(parts[0])
            m = int(parts[1]) if len(parts) > 1 else 0
            if 'pm' in val_lower and h < 12:
                h += 12
            elif 'am' in val_lower and h == 12:
                h = 0
            return h * 60 + m
        except Exception:
            return 9999
    try:
        parts = val_str.split(':')
        h = int(parts[0])
        m = int(parts[1]) if len(parts) > 1 else 0
        return h * 60 + m
    except Exception:
        return 9999

def _schedule_deadline_sort_key(sch):
    today_str = datetime.now().strftime("%Y-%m-%d")
    date_str = str(sch.start_date or sch.schedule_date or today_str).strip()
    if date_str < today_str:
        date_str = today_str
    time_minutes = _parse_time_sort_key(sch.time_value)
    return (date_str, time_minutes, sch.schedule_id)

class DoseAlert:
    def __init__(self):
        self.db = DatabaseManager()

    def add_schedule(self, med_id, schedule_type, time_value, schedule_date=None, dose_per_intake=1, dose_unit='tablet', frequency='Every day', start_date=None, end_date=None, instructions=''):
        return self.db.execute_query(
            '''INSERT INTO schedules (medication_id, schedule_type, time_value, schedule_date, dose_per_intake, dose_unit, frequency, start_date, end_date, instructions, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')''',
            (med_id, schedule_type, time_value, schedule_date, dose_per_intake, dose_unit, frequency, start_date, end_date, instructions)
        )

    def cleanup_expired_schedules(self, user_id=None):
        """
        Automatically deletes schedules whose end_date has expired:
        1. end_date < today_str (The end date has passed)
        2. end_date == today_str and dose for today has already been taken (final dose completed)
        """
        try:
            today_str = datetime.now().strftime("%Y-%m-%d")
            user_filter = "AND m.user_id = ?" if user_id is not None else ""
            params = (today_str, user_id) if user_id is not None else (today_str,)

            # 1. Delete all schedules where end_date is strictly before today
            query_past = f'''
                DELETE FROM schedules 
                WHERE id IN (
                    SELECT s.id FROM schedules s
                    JOIN medications m ON s.medication_id = m.id
                    WHERE s.end_date IS NOT NULL 
                      AND s.end_date != '' 
                      AND TRIM(s.end_date) < ?
                      {user_filter}
                )
            '''
            self.db.execute_query(query_past, params)

            # 2. Delete schedules where end_date == today AND the dose was already TAKEN today
            query_completed_today = f'''
                DELETE FROM schedules
                WHERE id IN (
                    SELECT s.id FROM schedules s
                    JOIN medications m ON s.medication_id = m.id
                    JOIN intake_log l ON l.medication_id = s.medication_id
                    WHERE s.end_date IS NOT NULL
                      AND s.end_date != ''
                      AND TRIM(s.end_date) = ?
                      AND l.status = 'TAKEN'
                      AND (l.timestamp LIKE ? OR date(l.timestamp) = ?)
                      {user_filter}
                )
            '''
            params_today = (today_str, f"{today_str}%", today_str, user_id) if user_id is not None else (today_str, f"{today_str}%", today_str)
            self.db.execute_query(query_completed_today, params_today)
        except Exception as e:
            print(f"[DoseAlert] Note cleaning up expired schedules: {e}")

    def get_user_schedules(self, user_id):
        self.cleanup_expired_schedules(user_id)
        query = '''
            SELECT s.id, s.medication_id, s.schedule_type, s.time_value, s.schedule_date,
                   COALESCE(s.dose_per_intake, 1), COALESCE(s.dose_unit, 'tablet'), COALESCE(s.frequency, 'Every day'),
                   s.start_date, s.end_date, COALESCE(s.instructions, ''), COALESCE(s.status, 'ACTIVE'),
                   m.name, COALESCE(NULLIF(m.strength, ''), m.dosage), m.stock, COALESCE(NULLIF(m.stock_unit, ''), 'tablets'),
                   m.image_path
            FROM schedules s
            JOIN medications m ON s.medication_id = m.id
            WHERE m.user_id = ?
        '''
        rows = self.db.fetch_all(query, (user_id,))
        schedules = [Schedule(*row) for row in rows]
        schedules.sort(key=_schedule_deadline_sort_key)
        return schedules

    def delete_schedule(self, schedule_id):
        self.db.execute_query("DELETE FROM schedules WHERE id = ?", (schedule_id,))

    def get_medication_schedules(self, med_id):
        rows = self.db.fetch_all("SELECT id, medication_id, schedule_type, time_value, schedule_date FROM schedules WHERE medication_id = ?", (med_id,))
        return [Schedule(*row) for row in rows]

    def get_due_medications(self, user_id):
        """
        Returns a list of medication dicts that are currently due TODAY for the specific user.
        Excludes doses scheduled for other dates, and doses already taken today.
        """
        if not user_id:
            return []

        self.cleanup_expired_schedules(user_id)
        due_meds = []
        now = datetime.now()
        today_str = now.strftime("%Y-%m-%d")

        query = '''
            SELECT m.id, m.name, m.dosage, s.schedule_type, s.time_value, s.schedule_date,
            (SELECT MAX(timestamp) FROM intake_log WHERE medication_id = m.id AND status = 'TAKEN') as last_taken,
            m.image_path, COALESCE(NULLIF(m.strength, ''), m.dosage)
            FROM medications m
            JOIN schedules s ON m.id = s.medication_id
            WHERE m.user_id = ?
        '''
        rows = self.db.fetch_all(query, (user_id,))

        for med_id, med_name, dosage, sched_type, time_value, sched_date, last_taken_str, image_path, strength in rows:
            if sched_date and str(sched_date).strip():
                clean_date = str(sched_date).strip()
                if clean_date != today_str:
                    continue

            last_taken_time = None
            if last_taken_str:
                try:
                    last_taken_time = datetime.strptime(last_taken_str, "%Y-%m-%d %H:%M:%S")
                except Exception:
                    pass

            if last_taken_time and last_taken_time.date() == now.date():
                continue

            is_due = False
            if sched_type == 'DAILY_TIME':
                try:
                    raw_time = str(time_value).strip()[:5]
                    sched_time = datetime.strptime(raw_time, "%H:%M").time()
                    if now.time() >= sched_time:
                        is_due = True
                except Exception:
                    pass
            elif sched_type == 'INTERVAL':
                try:
                    hours = int(time_value)
                    if not last_taken_time:
                        is_due = True
                    elif now >= last_taken_time + timedelta(hours=hours):
                        is_due = True
                except Exception:
                    pass

            if is_due:
                due_meds.append({
                    "med_id": med_id, 
                    "name": med_name, 
                    "dosage": dosage,
                    "strength": strength,
                    "time_value": time_value,
                    "schedule_date": sched_date or today_str,
                    "image_path": image_path
                })

        due_meds.sort(key=lambda m: (m.get('schedule_date') or today_str, _parse_time_sort_key(m.get('time_value'))))
        return due_meds
