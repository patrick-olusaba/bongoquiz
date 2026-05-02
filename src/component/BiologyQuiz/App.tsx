import './styles/styles.css';
import './styles/aviator.css';
import { useQuiz } from './hooks/useQuiz';
import { LandingPage } from './components/LandingPage';
import { Quiz } from './components/Quiz';
import { Results } from './components/Results';
import { PaymentScreen } from './components/PaymentScreen';
import { AviatorBackground } from './components/AviatorBackground';
import BiologyGameIntro from './components/BiologyGameIntro';

export default function App() {
    const quizState = useQuiz();

    return (
        <div className="app-wrapper">
            <AviatorBackground />
            <>
                {quizState.currentScreen === 'landing' && (
                    <LandingPage
                        onStartGame={quizState.handleGoToPayment}
                        playerName={quizState.playerName}
                        setPlayerName={quizState.setPlayerName}
                        playerPhone={quizState.playerPhone}
                        setPlayerPhone={quizState.setPlayerPhone}
                        leaderboard={quizState.leaderboard}
                    />
                )}

                {quizState.currentScreen === 'payment' && (
                    <PaymentScreen
                        playerName={quizState.playerName}
                        playerPhone={quizState.playerPhone}
                        onPayAndPlay={quizState.handleStartGame}
                        onCancel={quizState.handleCancelPayment}
                    />
                )}

                {quizState.currentScreen === 'intro' && (
                    <BiologyGameIntro onDone={quizState.doStartGame} />
                )}

                {quizState.currentScreen === 'quiz' && (
                    <div className="quiz-wrapper">
                        <Quiz
                            topicQuestions={quizState.topicQuestions}
                            currentQuestionIndex={quizState.currentQuestionIndex}
                            score={quizState.score}
                            selectedAnswer={quizState.selectedAnswer}
                            isAnswerCorrect={quizState.isAnswerCorrect}
                            isFeedbackModalOpen={quizState.isFeedbackModalOpen}
                            onAnswerSelect={quizState.handleAnswerSelect}
                            onSkipQuestion={quizState.handleSkipQuestion}
                            onNextQuestion={quizState.handleNextQuestion}
                            onBackToTopics={quizState.handleQuitGame}
                            setIsFeedbackModalOpen={quizState.setIsFeedbackModalOpen}
                            timeLeft={quizState.timeLeft}
                        />
                    </div>
                )}

                {quizState.currentScreen === 'results' && (
                    <div className="center-content">
                        <Results
                            score={quizState.score}
                            correctCount={quizState.correctCount}
                            wrongCount={quizState.wrongCount}
                            onPlayAgain={quizState.handlePlayAgain}
                            onBackToMenu={quizState.handleBackToMenu}
                            leaderboard={quizState.leaderboard}
                            playerName={quizState.playerName}
                        />
                    </div>
                )}
            </>
        </div>
    );
}
