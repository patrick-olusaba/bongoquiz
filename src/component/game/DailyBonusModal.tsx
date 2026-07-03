import {type FC} from "react";
import {createPortal} from "react-dom";
import {Coins, Gift} from "lucide-react";

type DailyBonusModalProps = {
    open: boolean;
    rewards: number[];
    activeDay: number;
    claimedToday: boolean;
    claiming: boolean;
    onClaim: () => void;
    onClose: () => void;
};

export const DailyBonusModal: FC<DailyBonusModalProps> = ({
                                                              open,
                                                              rewards,
                                                              activeDay,
                                                              claimedToday,
                                                              claiming,
                                                              onClaim,
                                                              onClose,
                                                          }) => {
    if (!open) return null;

    return createPortal(
        <div className="reward-modal-overlay" role="presentation">
            <div className="reward-modal-content" role="dialog" aria-modal="true" aria-labelledby="daily-bonus-title">
                <button className="reward-modal-close" onClick={onClose} aria-label="Close daily bonus">x</button>
                <div className="reward-modal-ribbon"><Gift size={64}/></div>
                <div className="reward-modal-header">
                    <h2 id="daily-bonus-title">Claim daily bonus. Boost your score.</h2>
                </div>
                <div className="reward-modal-body">
                    <div className="reward-modal-days">
                        {rewards.map((points, index) => {
                            const day = index + 1;
                            const isActive = day === activeDay;
                            const isDone = claimedToday && day === activeDay;
                            return (
                                <div
                                    key={day}
                                    className={"reward-modal-day" + (isActive ? " active" : "") + (isDone ? " claimed" : "")}>
                                    <div className="reward-modal-day-icon">
                                        {day === 7 ? <Coins size={32}/> : <Coins size={20}/>}
                                    </div>
                                    <strong>+{points}</strong>
                                    <span>Day {day}</span>
                                </div>
                            );
                        })}
                    </div>
                    <button className="reward-modal-claim-btn" disabled={claiming || claimedToday} onClick={onClaim}>
                        {claiming ? "Claiming..." : "Check-In"}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
};
