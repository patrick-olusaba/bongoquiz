import type { Question } from '../types';

export const questions: Question[] = [
  { id: 'm1', topic: 'Arithmetic', question: 'What is 15 + 27?', options: ['32', '42', '38', '44'], correct_answer: '42', explanation: '15 + 27 = 42' },
  { id: 'm2', topic: 'Arithmetic', question: 'Find the value of 100 − 45.', options: ['65', '55', '45', '50'], correct_answer: '55', explanation: '100 − 45 = 55' },
  { id: 'm3', topic: 'Arithmetic', question: 'What is 8 × 7?', options: ['54', '56', '64', '49'], correct_answer: '56', explanation: '8 × 7 = 56' },
  { id: 'm4', topic: 'Arithmetic', question: 'Divide 81 by 9.', options: ['7', '9', '8', '11'], correct_answer: '9', explanation: '81 ÷ 9 = 9' },
  { id: 'm5', topic: 'Number Patterns', question: 'What is the next number: 2, 4, 6, 8, …?', options: ['9', '10', '12', '11'], correct_answer: '10', explanation: 'Add 2 each time.' },
  { id: 'm6', topic: 'Geometry', question: 'A triangle has how many sides?', options: ['4', '3', '5', '2'], correct_answer: '3', explanation: 'A triangle has 3 sides.' },
  { id: 'm7', topic: 'Fractions', question: 'What is ½ of 50?', options: ['20', '25', '30', '15'], correct_answer: '25', explanation: '50 ÷ 2 = 25' },
  { id: 'm8', topic: 'Number Theory', question: 'Which is a prime number?', options: ['4', '7', '9', '15'], correct_answer: '7', explanation: '7 is only divisible by 1 and itself.' },
  { id: 'm9', topic: 'Time', question: 'How many minutes are in 1 hour?', options: ['100', '60', '120', '50'], correct_answer: '60', explanation: '1 hour = 60 minutes.' },
  { id: 'm10', topic: 'Powers', question: 'What is 5²?', options: ['10', '25', '50', '15'], correct_answer: '25', explanation: '5² = 5 × 5 = 25' },
  { id: 'm11', topic: 'Algebra', question: 'If x + 5 = 12, what is x?', options: ['5', '7', '8', '6'], correct_answer: '7', explanation: 'x = 12 − 5 = 7' },
  { id: 'm12', topic: 'Algebra', question: 'Solve: 3x = 18', options: ['4', '5', '6', '7'], correct_answer: '6', explanation: 'x = 18 ÷ 3 = 6' },
  { id: 'm13', topic: 'Percentages', question: 'What is 20% of 80?', options: ['12', '14', '16', '18'], correct_answer: '16', explanation: '20/100 × 80 = 16' },
  { id: 'm14', topic: 'Geometry', question: 'What is the area of a rectangle 5 cm × 4 cm?', options: ['18 cm²', '20 cm²', '22 cm²', '24 cm²'], correct_answer: '20 cm²', explanation: 'Area = length × width = 5 × 4 = 20 cm²' },
  { id: 'm15', topic: 'Fractions', question: 'What is ¾ + ¼?', options: ['½', '1', '1½', '2'], correct_answer: '1', explanation: '3/4 + 1/4 = 4/4 = 1' },
  { id: 'm16', topic: 'Number Theory', question: 'What is the LCM of 4 and 6?', options: ['8', '10', '12', '24'], correct_answer: '12', explanation: 'LCM(4,6) = 12' },
  { id: 'm17', topic: 'Number Theory', question: 'What is the HCF of 12 and 18?', options: ['3', '4', '6', '9'], correct_answer: '6', explanation: 'HCF(12,18) = 6' },
  { id: 'm18', topic: 'Arithmetic', question: 'What is 144 ÷ 12?', options: ['10', '11', '12', '13'], correct_answer: '12', explanation: '144 ÷ 12 = 12' },
  { id: 'm19', topic: 'Powers', question: 'What is √64?', options: ['6', '7', '8', '9'], correct_answer: '8', explanation: '√64 = 8 because 8² = 64' },
  { id: 'm20', topic: 'Geometry', question: 'How many degrees are in a right angle?', options: ['45°', '90°', '180°', '360°'], correct_answer: '90°', explanation: 'A right angle = 90°' },
];

export const getRandomQuestions = (count: number): Question[] => {
  const shuffled = [...questions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
