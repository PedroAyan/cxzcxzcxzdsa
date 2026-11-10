import assert from 'node:assert/strict';
import { QUESTIONS, GIFT_MESSAGE, QUIZ_INTRO, QUIZ_DESCRIPTION, createQuiz } from '../quiz.js';
assert.equal(QUIZ_INTRO,'parabens gatinha');assert.equal(QUIZ_DESCRIPTION,'quiz para saber se vc merece algo');
assert.equal(GIFT_MESSAGE,'parabens meu amor voce acertou todas\npode abrir o valorant');
assert.deepEqual(QUESTIONS.map(q=>q.options[q.correct]),[
  'vai se fuder pedro','se mata porra','vou te dar para os bodes','fodase boa noite  😡😡😡😡',
]);
const correct=[2,2,0,2];let scenarios=0;
for(let a=0;a<4;a++)for(let b=0;b<3;b++)for(let c=0;c<3;c++)for(let d=0;d<QUESTIONS[3].options.length;d++){
  const answers=[a,b,c,d],quiz=createQuiz();
  assert.equal(quiz.answer('acordar',a),false,'Não responde antes de começar');
  assert.equal(quiz.start(),true);assert.equal(quiz.start(),false);
  answers.forEach((answer,i)=>{
    assert.equal(quiz.getState().stage,'question');
    assert.equal(quiz.getState().question.id,QUESTIONS[i].id);
    assert.equal(quiz.answer('inexistente',answer),false);
    assert.equal(quiz.answer(QUESTIONS[i].id,-1),false);
    assert.equal(quiz.answer(QUESTIONS[i].id,answer),true);
    assert.equal(quiz.answer(QUESTIONS[i].id,answer),false,'Envio repetido não avança duas perguntas');
    if(i<3)assert.notEqual(quiz.getState().stage,'result','Sem resultado antes das quatro perguntas');
  });
  const expected=answers.filter((answer,i)=>answer===correct[i]).length;
  assert.equal(quiz.getState().score,expected);
  assert.equal(quiz.getState().passed,expected>=1,'Basta pelo menos um acerto');
  assert.equal(quiz.getState().stage,'result');
  quiz.reset();assert.equal(quiz.getState().stage,'intro');assert.equal(quiz.getState().score,0);
  assert.deepEqual(quiz.getState().answers,[]);scenarios++;
}
assert.equal(scenarios,216);
console.log('OK: quatro perguntas, seis opções na última, 216 combinações, presente com 1–4 acertos, falha com zero, proteção contra envio duplicado e reinício.');
