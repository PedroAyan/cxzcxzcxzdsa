export const QUIZ_INTRO = 'parabens gatinha';
export const QUIZ_DESCRIPTION = 'quiz para saber se vc merece algo';
export const GIFT_MESSAGE = 'voce foi bem camila oque vc quer de presente';

export const QUESTIONS = [
  {
    id: 'acordar',
    text: 'oq falar pro pedro quando acabei de acordar',
    options: ['bom dia', 'que saudades', 'vai se fuder pedro', 'sonhei com vc'],
    correct: 2,
  },
  {
    id: 'ward',
    text: 'oq falar pro pedro quando ele pegar sua ward',
    options: ['pode pegar todas as wards pedro', 'nao tem problema a gente divide tudo', 'se mata porra'],
    correct: 2,
  },
  {
    id: 'valorant',
    text: 'oq falar pro pedro quando ele rouba sua kill no valorant e te mata no fogo do phoenix',
    options: ['vou te dar para os bodes', 'nao tem problema meu amor', 'tudo para voce'],
    correct: 0,
  },
  {
    id: 'dormir',
    text: 'oq falar quando estou indo dormir para o pedro',
    options: ['te amo', 'MWWAAAAAAAAAC', 'fodase boa noite  😡😡😡😡', 'MWAAAAAAAAAAAAAAAAAAAAAAAAAAAAC'],
    correct: 2,
  },
];

export function createQuiz() {
  let stage = 'intro', index = 0, answers = [];
  return {
    getState() {
      const score = answers.reduce((total, answer, i) => total + Number(answer === QUESTIONS[i].correct), 0);
      return { stage, index, answers: [...answers], score, passed: stage === 'result' && score >= 1,
        question: stage === 'question' ? QUESTIONS[index] : null };
    },
    start() {
      if (stage !== 'intro') return false;
      stage = 'question';
      return true;
    },
    answer(questionId, option) {
      if (stage !== 'question' || QUESTIONS[index].id !== questionId || !Number.isInteger(option)
        || option < 0 || option >= QUESTIONS[index].options.length) return false;
      answers.push(option);
      index++;
      if (index === QUESTIONS.length) stage = 'result';
      return true;
    },
    reset() { stage = 'intro'; index = 0; answers = []; },
  };
}
