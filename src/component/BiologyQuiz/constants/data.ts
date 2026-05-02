import type {Question} from '../types';

export const questions: Question[] = [
  // FORM 1
  {
    id: 'f1_intro_1',
    class_level: 'Form 1',
    topic: 'Introduction to Biology',
    question: 'What is Biology?',
    options: [
      'The study of the earth',
      'The study of living things',
      'The study of chemicals',
      'The study of stars and planets'
    ],
    correct_answer: 'The study of living things',
    explanation: 'Biology is derived from two Greek words: "bios" meaning life and "logos" meaning knowledge or study. Therefore, it is the study of living things.'
  },
  {
    id: 'f1_intro_2',
    class_level: 'Form 1',
    topic: 'Introduction to Biology',
    question: 'Which of the following is NOT a characteristic of living things?',
    options: [
      'Respiration',
      'Reproduction',
      'Crystallization',
      'Irritability'
    ],
    correct_answer: 'Crystallization',
    explanation: 'Crystallization is a process associated with non-living things (like salt forming crystals). Living things exhibit characteristics like nutrition, respiration, excretion, growth, reproduction, movement, and irritability.'
  },
  {
    id: 'f1_intro_3',
    class_level: 'Form 1',
    topic: 'Introduction to Biology',
    question: 'Which branch of biology deals with the study of animals?',
    options: [
      'Botany',
      'Zoology',
      'Microbiology',
      'Ecology'
    ],
    correct_answer: 'Zoology',
    explanation: 'Zoology is the branch of biology that focuses on the study of animals. Botany is the study of plants, and microbiology is the study of microscopic organisms.'
  },
  {
    id: 'f1_class1_1',
    class_level: 'Form 1',
    topic: 'Classification 1',
    question: 'What is the basic unit of classification?',
    options: [
      'Kingdom',
      'Phylum',
      'Genus',
      'Species'
    ],
    correct_answer: 'Species',
    explanation: 'The species is the lowest and most basic unit of classification, consisting of organisms that can interbreed to produce fertile offspring.'
  },
  {
    id: 'f1_cells_1',
    class_level: 'Form 1',
    topic: 'Cells',
    question: 'Which part of the cell is selectively permeable and controls the movement of substances in and out of the cell?',
    options: [
      'Cell wall',
      'Nucleus',
      'Cell membrane',
      'Cytoplasm'
    ],
    correct_answer: 'Cell membrane',
    explanation: 'The cell membrane is a selectively permeable lipid bilayer that regulates the passage of materials into and out of the cell.'
  },
  {
    id: 'f1_cellphys_1',
    class_level: 'Form 1',
    topic: 'Cell Physiology',
    question: 'What is the process by which water molecules move from a region of high concentration to a region of low concentration across a semi-permeable membrane?',
    options: [
      'Diffusion',
      'Active transport',
      'Osmosis',
      'Plasmolysis'
    ],
    correct_answer: 'Osmosis',
    explanation: 'Osmosis is the movement of water molecules from a region of higher water potential to a region of lower water potential through a semi-permeable membrane.'
  },
  {
    id: 'f1_nutr_1',
    class_level: 'Form 1',
    topic: 'Nutrition in Plants and in Animals',
    question: 'Which enzyme in the human saliva begins the digestion of starch?',
    options: [
      'Pepsin',
      'Salivary amylase',
      'Lipase',
      'Trypsin'
    ],
    correct_answer: 'Salivary amylase',
    explanation: 'Salivary amylase (ptyalin) breaks down complex starch molecules into simpler sugars like maltose in the mouth.'
  },

  // FORM 2
  {
    id: 'f2_trans_1',
    class_level: 'Form 2',
    topic: 'Transport',
    question: 'Which blood vessels carry blood away from the heart?',
    options: [
      'Veins',
      'Capillaries',
      'Arteries',
      'Venules'
    ],
    correct_answer: 'Arteries',
    explanation: 'Arteries have thick, muscular walls to carry blood pumped away from the heart at high pressure.'
  },
  {
    id: 'f2_gas_1',
    class_level: 'Form 2',
    topic: 'Gaseous Exchange',
    question: 'What is the main respiratory surface in terrestrial insects?',
    options: [
      'Alveoli',
      'Gills',
      'Tracheoles',
      'Skin'
    ],
    correct_answer: 'Tracheoles',
    explanation: 'In insects, gaseous exchange occurs in the tracheoles, which are fine tubes directly in contact with the body tissues.'
  },
  {
    id: 'f2_resp_1',
    class_level: 'Form 2',
    topic: 'Respiration',
    question: 'Where does aerobic respiration mainly take place in a cell?',
    options: [
      'Nucleus',
      'Ribosome',
      'Mitochondrion',
      'Golgi body'
    ],
    correct_answer: 'Mitochondrion',
    explanation: 'Mitochondria are the "powerhouses" of the cell where energy is released from food through aerobic respiration.'
  },
  {
    id: 'f2_excr_1',
    class_level: 'Form 2',
    topic: 'Excretion and Homoeostasis',
    question: 'Which organ is primarily responsible for the excretion of urea in humans?',
    options: [
      'Liver',
      'Skin',
      'Lungs',
      'Kidney'
    ],
    correct_answer: 'Kidney',
    explanation: 'The kidneys filter urea and other waste products from the blood to form urine, which is then excreted.'
  },

  // FORM 3
  {
    id: 'f3_class2_1',
    class_level: 'Form 3',
    topic: 'Classification 2',
    question: 'Which kingdom do bacteria belong to?',
    options: [
      'Fungi',
      'Protoctista',
      'Monera',
      'Plantae'
    ],
    correct_answer: 'Monera',
    explanation: 'Bacteria belong to the Kingdom Monera, which consists of unicellular organisms that lack a true nucleus (prokaryotes).'
  },
  {
    id: 'f3_eco_1',
    class_level: 'Form 3',
    topic: 'Ecology',
    question: 'What term describes the role of an organism in its habitat?',
    options: [
      'Ecosystem',
      'Niche',
      'Population',
      'Community'
    ],
    correct_answer: 'Niche',
    explanation: 'An ecological niche is the specific role or function of an organism within its ecosystem, including what it eats, its predators, and how it interacts with the environment.'
  },
  {
    id: 'f3_repro_1',
    class_level: 'Form 3',
    topic: 'Reproduction in Plants and Animals',
    question: 'What is the function of the prostate gland in the human male reproductive system?',
    options: [
      'Produces sperm cells',
      'Secretes an alkaline fluid to neutralize vaginal acidity',
      'Stores sperm until they mature',
      'Transports urine out of the body'
    ],
    correct_answer: 'Secretes an alkaline fluid to neutralize vaginal acidity',
    explanation: 'The prostate gland secretes an alkaline fluid that forms part of the semen and helps protect sperm from the acidic environment of the vagina.'
  },
  {
    id: 'f3_growth_1',
    class_level: 'Form 3',
    topic: 'Growth and Development',
    question: 'What type of germination occurs when the cotyledons are brought above the ground?',
    options: [
      'Hypogeal germination',
      'Epigeal germination',
      'Primary germination',
      'Secondary germination'
    ],
    correct_answer: 'Epigeal germination',
    explanation: 'In epigeal germination, the hypocotyl elongates rapidly and pulls the cotyledons above the soil surface (e.g., in beans).'
  },

  // FORM 4
  {
    id: 'f4_gen_1',
    class_level: 'Form 4',
    topic: 'Genetics',
    question: 'Who is known as the father of genetics?',
    options: [
      'Charles Darwin',
      'Louis Pasteur',
      'Gregor Mendel',
      'Robert Hooke'
    ],
    correct_answer: 'Gregor Mendel',
    explanation: 'Gregor Mendel is considered the father of genetics for his pioneering work on inheritance using pea plants.'
  },
  {
    id: 'f4_evo_1',
    class_level: 'Form 4',
    topic: 'Evolution',
    question: 'Which theory of evolution was proposed by Charles Darwin?',
    options: [
      'Theory of Acquired Characteristics',
      'Theory of Natural Selection',
      'Theory of Special Creation',
      'Theory of Spontaneous Generation'
    ],
    correct_answer: 'Theory of Natural Selection',
    explanation: 'Charles Darwin proposed the theory of Natural Selection, where organisms better adapted to their environment tend to survive and produce more offspring.'
  },
  {
    id: 'f4_recep_1',
    class_level: 'Form 4',
    topic: 'Reception Response and Coordination',
    question: 'Which part of the human brain is responsible for controlling voluntary movements and balance?',
    options: [
      'Cerebrum',
      'Medulla oblongata',
      'Cerebellum',
      'Hypothalamus'
    ],
    correct_answer: 'Cerebellum',
    explanation: 'The cerebellum coordinates voluntary muscle movements and maintains posture and balance.'
  },
  {
    id: 'f4_supp_1',
    class_level: 'Form 4',
    topic: 'Support in Animals and in Plants',
    question: 'What type of skeleton is found in insects?',
    options: [
      'Endoskeleton',
      'Exoskeleton',
      'Hydrostatic skeleton',
      'Cartilaginous skeleton'
    ],
    correct_answer: 'Exoskeleton',
    explanation: 'Insects have an exoskeleton, a hard outer covering made of chitin that provides support and protection.'
  }
];

export const getRandomQuestions = (count: number) => {
  const shuffled = [...questions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
