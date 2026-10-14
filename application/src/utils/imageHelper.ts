/**
 * Resolves medication image URL based on medication name or stored image path.
 * Guarantees crisp drug thumbnails across popups, modals, cards, and notifications.
 */
export function getMedicationImageUrl(name?: string, imagePath?: string): string {
  if (imagePath && imagePath.startsWith('data:')) {
    return imagePath;
  }
  const nameClean = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // High-res photo matching
  if (nameClean.includes('paracetamol') || nameClean.includes('biogesic')) return '/drug_images/paracetamol.jpg';
  if (nameClean.includes('vitaminc') || (nameClean.includes('vitamin') && nameClean.includes('c')) || nameClean.includes('ascorbic')) return '/drug_images/vitaminc.jpg';
  if (nameClean.includes('multivitamin') || nameClean.includes('centrum') || nameClean.includes('revicon')) return '/drug_images/multivitamin.jpg';
  if (nameClean.includes('ibuprofen') || nameClean.includes('advil') || nameClean.includes('motrin')) return '/drug_images/ibuprofen.jpg';

  if (imagePath) {
    if (imagePath.startsWith('http') || imagePath.startsWith('/')) {
      return imagePath;
    }
    return `/drug_images/${imagePath.replace('/drug_images/', '')}`;
  }

  // Pre-rendered PNG library in /drug_images/
  const knownPrefixes = [
    'allopurinol', 'alprazolam', 'amitriptyline', 'amlodipine', 'amoxicillin',
    'aspirin', 'atenolol', 'atorvastatin', 'azithromycin', 'bupropion',
    'cephalexin', 'cetirizine', 'ciprofloxacin', 'citalopram', 'clonazepam',
    'clopidogrel', 'diazepam', 'diclofenac', 'doxycycline', 'duloxetine',
    'escitalopram', 'famotidine', 'fluoxetine', 'fluticasone', 'furosemide',
    'gabapentin', 'levothyroxine', 'loratadine', 'lorazepam', 'losartan',
    'meloxicam', 'metformin', 'metoprolol', 'mirtazapine', 'naproxen',
    'omeprazole', 'ondansetron', 'pantoprazole', 'pravastatin', 'rosuvastatin',
    'salbutamol', 'sertraline', 'simvastatin', 'tamsulosin', 'tramadol',
    'trazodone', 'venlafaxine', 'zolpidem'
  ];

  for (const prefix of knownPrefixes) {
    if (nameClean.startsWith(prefix) || nameClean.includes(prefix)) {
      return `/drug_images/${prefix}.png`;
    }
  }

  return '/drug_images/paracetamol.jpg';
}
