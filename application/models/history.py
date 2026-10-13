from database.db_manager import DatabaseManager
from datetime import datetime
import csv
import os

class HistoryLog:
    def __init__(self, log_id, user_id, med_id, med_name, timestamp, status):
        self.log_id = log_id
        self.user_id = user_id
        self.med_id = med_id
        self.med_name = med_name
        self.timestamp = timestamp
        self.status = status

class ReportGenerator:
    def __init__(self):
        self.db = DatabaseManager()

    def log_intake(self, user_id, med_id, status, timestamp=None):
        if not timestamp:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        row = self.db.fetch_one("SELECT name FROM medications WHERE id = ?", (med_id,))
        med_name = row[0] if row and row[0] else "Medication"
        self.db.execute_query(
            "INSERT INTO intake_log (user_id, medication_id, medication_name, timestamp, status) VALUES (?, ?, ?, ?, ?)",
            (user_id, med_id, med_name, timestamp, status)
        )

    def delete_log(self, log_id):
        self.db.execute_query("DELETE FROM intake_log WHERE id = ?", (log_id,))

    def get_user_history(self, user_id=None):
        if user_id is not None:
            query = '''
                SELECT l.id, l.user_id, l.medication_id, 
                       COALESCE(NULLIF(l.medication_name, ''), m.name, 'Deleted Medication') AS med_name, 
                       l.timestamp, l.status 
                FROM intake_log l
                LEFT JOIN medications m ON l.medication_id = m.id
                WHERE l.user_id = ?
                ORDER BY l.timestamp DESC
            '''
            rows = self.db.fetch_all(query, (user_id,))
        else:
            query = '''
                SELECT l.id, l.user_id, l.medication_id, 
                       COALESCE(NULLIF(l.medication_name, ''), m.name, 'Deleted Medication') AS med_name, 
                       l.timestamp, l.status 
                FROM intake_log l
                LEFT JOIN medications m ON l.medication_id = m.id
                ORDER BY l.timestamp DESC
            '''
            rows = self.db.fetch_all(query)
        return [HistoryLog(*row) for row in rows]

    def export_to_csv(self, user_id, filepath):
        history = self.get_user_history(user_id)
        with open(filepath, mode='w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerow(['Log ID', 'Medication Name', 'Timestamp', 'Status'])
            for log in history:
                writer.writerow([log.log_id, log.med_name, log.timestamp, log.status])
        return True

    def check_and_log_missed_doses(self, user_id=None):
        """
        Auto-logs 'MISSED' intake records for any active scheduled doses whose time
        has passed today (or over recent active dates) without being taken or already logged.
        """
        try:
            from datetime import timedelta
            now = datetime.now()
            today_str = now.strftime("%Y-%m-%d")
            now_time_str = now.strftime("%H:%M")

            user_filter = "WHERE m.user_id = ?" if user_id is not None else ""
            params = (user_id,) if user_id is not None else ()

            # Query all active schedules
            query = f'''
                SELECT s.id, s.medication_id, m.name, s.time_value, s.start_date, s.end_date, s.schedule_date, m.user_id
                FROM schedules s
                JOIN medications m ON s.medication_id = m.id
                {user_filter}
            '''
            schedules = self.db.fetch_all(query, params)
            if not schedules:
                return 0

            logged_count = 0

            # Check today and the past 2 days (up to 3 days back)
            for day_offset in range(3):
                target_date = (now - timedelta(days=day_offset)).date()
                target_date_str = target_date.strftime("%Y-%m-%d")
                is_today = (day_offset == 0)

                for sched_id, med_id, med_name, time_value, start_date, end_date, sched_date, uid in schedules:
                    start = (start_date or sched_date or '').strip()
                    end = (end_date or '').strip()

                    # Check if schedule was active on target_date
                    if start and start > target_date_str:
                        continue
                    if end and end < target_date_str:
                        continue

                    # Extract schedule time e.g. "08:00"
                    raw_time = str(time_value).strip()[:5]
                    if not raw_time or len(raw_time) < 4:
                        raw_time = "08:00"

                    # If checking today, only consider missed if scheduled time has passed
                    if is_today and raw_time > now_time_str:
                        continue

                    # Check if an intake was already logged on target_date for this user and med
                    existing = self.db.fetch_one('''
                        SELECT id, status FROM intake_log
                        WHERE user_id = ? AND medication_id = ? AND date(timestamp) = ?
                    ''', (uid, med_id, target_date_str))

                    if not existing:
                        missed_ts = f"{target_date_str} {raw_time}:00"
                        self.db.execute_query('''
                            INSERT INTO intake_log (user_id, medication_id, medication_name, timestamp, status)
                            VALUES (?, ?, ?, ?, 'MISSED')
                        ''', (uid, med_id, med_name or "Medication", missed_ts))
                        logged_count += 1

            return logged_count
        except Exception as e:
            print(f"[ReportGenerator] Note checking missed doses: {e}")
            return 0

