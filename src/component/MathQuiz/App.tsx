import '../BiologyQuiz/styles/styles.css';
import { BottomNav } from '../game/BottomNav';
import { useQuiz } from './hooks/useQuiz';
import { LandingPage } from './components/LandingPage';
import { Quiz } from './components/Quiz';
import { Results } from './components/Results';
import { PaymentScreen } from './components/PaymentScreen';
import { MathBackground } from './components/MathBackground';
import MathGameIntro from './components/MathGameIntro';

export default function App() {
  const q = useQuiz();
  return (
    <>
      <div className="app-wrapper">
        <MathBackground />
        {q.currentScreen === 'landing' && (
          <LandingPage
            onStartGame={q.handleGoToPayment}
            playerName={q.playerName} setPlayerName={q.setPlayerName}
            playerPhone={q.playerPhone} setPlayerPhone={q.setPlayerPhone}
            leaderboard={q.leaderboard}
          />
        )}
        {q.currentScreen === 'payment' && (
          <PaymentScreen
            playerName={q.playerName} playerPhone={q.playerPhone}
            onPayAndPlay={q.handleStartGame} onCancel={q.handleCancelPayment}
          />
        )}
        {q.currentScreen === 'intro' && <MathGameIntro onDone={q.doStartGame} />}
        {q.currentScreen === 'quiz' && (
          <div className="quiz-wrapper">
            <Quiz
              topicQuestions={q.topicQuestions}
              currentQuestionIndex={q.currentQuestionIndex}
              score={q.score}
              selectedAnswer={q.selectedAnswer}
              isAnswerCorrect={q.isAnswerCorrect}
              isFeedbackModalOpen={q.isFeedbackModalOpen}
              onAnswerSelect={q.handleAnswerSelect}
              onSkipQuestion={q.handleSkipQuestion}
              onNextQuestion={q.handleNextQuestion}
              onBackToTopics={q.handleQuitGame}
              setIsFeedbackModalOpen={q.setIsFeedbackModalOpen}
              timeLeft={q.timeLeft}
            />
          </div>
        )}
        {q.currentScreen === 'results' && (
          <div className="center-content">
            <Results
              score={q.score} correctCount={q.correctCount} wrongCount={q.wrongCount}
              // onPlayAgain={q.handlePlayAgain} onBackToMenu={q.handleBackToMenu}
              leaderboard={q.leaderboard} playerName={q.playerName}
            />
          </div>
        )}
      </div>
      <BottomNav active="games" onNavigate={(tab) => {
        if (tab === 'leaderboard') window.dispatchEvent(new CustomEvent('show-leaderboard'));
        else window.location.href = `/?tab=${tab}`;
      }} />
    </>
  );
}
