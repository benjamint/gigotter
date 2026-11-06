/** Schools and programmes for sign-up. Anything missing can be typed in via "Other". */
export const SCHOOLS: { country: string; schools: string[] }[] = [
  { country: 'Ghana', schools: [
    'University of Ghana', 'Kwame Nkrumah University of Science and Technology (KNUST)', 'University of Cape Coast',
    'University of Education, Winneba', 'University for Development Studies', 'University of Professional Studies, Accra (UPSA)',
    'Ghana Institute of Management and Public Administration (GIMPA)', 'Ashesi University', 'University of Mines and Technology',
    'University of Health and Allied Sciences', 'University of Energy and Natural Resources', 'University of Media, Arts and Communication (UniMAC)',
    'Ghana Communication Technology University', 'Akenten Appiah-Menka University (AAMUSTED)', 'C.K. Tedam University of Technology and Applied Sciences',
    'S.D. Dombo University of Business and Integrated Development Studies', 'Accra Technical University', 'Kumasi Technical University',
    'Takoradi Technical University', 'Ho Technical University', 'Koforidua Technical University', 'Cape Coast Technical University',
    'Sunyani Technical University', 'Tamale Technical University', 'Bolgatanga Technical University',
    'Central University', 'Valley View University', 'Academic City University', 'Lancaster University Ghana', 'Pentecost University',
    'Methodist University Ghana', 'Presbyterian University, Ghana', 'Catholic University of Ghana', 'Wisconsin International University College',
    'Regent University College of Science and Technology', 'Ghana Christian University College', 'Nursing or Midwifery Training College (Ghana)',
    'College of Education (Ghana)',
  ] },
  { country: 'Nigeria', schools: [
    'University of Lagos', 'University of Ibadan', 'Obafemi Awolowo University', 'University of Nigeria, Nsukka', 'Ahmadu Bello University',
    'University of Benin', 'University of Ilorin', 'University of Port Harcourt', 'Lagos State University', 'Nnamdi Azikiwe University',
    'Federal University of Technology, Akure', 'Federal University of Technology, Minna', 'Covenant University', 'Babcock University',
    'Pan-Atlantic University', 'American University of Nigeria', 'Afe Babalola University', 'Yaba College of Technology',
  ] },
]
export const ALL_SCHOOLS = SCHOOLS.flatMap((g) => g.schools)

export const PROGRAMMES = [
  'Accounting', 'Actuarial Science', 'Agriculture', 'Architecture', 'Banking and Finance', 'Biochemistry', 'Biological Sciences',
  'Business Administration', 'Chemical Engineering', 'Chemistry', 'Civil Engineering', 'Communication Studies', 'Computer Engineering',
  'Computer Science', 'Data Science', 'Dentistry', 'Economics', 'Education', 'Electrical and Electronic Engineering', 'English',
  'Entrepreneurship', 'Fashion Design', 'Fine Art', 'French', 'Geography', 'Graphic Design', 'History', 'Hospitality and Tourism',
  'Human Resource Management', 'Information Technology', 'Journalism and Media', 'Law', 'Linguistics', 'Marketing', 'Mathematics',
  'Mechanical Engineering', 'Medical Laboratory Science', 'Medicine', 'Midwifery', 'Nursing', 'Pharmacy', 'Philosophy', 'Physics',
  'Physiotherapy', 'Political Science', 'Procurement and Supply Chain', 'Psychology', 'Public Administration', 'Public Health',
  'Real Estate', 'Social Work', 'Sociology', 'Statistics', 'Theatre Arts',
]
export const OTHER = '__other__'
