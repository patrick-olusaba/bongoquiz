import { Lightbulb } from 'lucide-react';

interface FooterProps {
    onHint: () => void;
}

export function Footer({ onHint }: FooterProps) {
    return (
        <footer className="sum-footer relative">
            <div className="sum-footer-item">
                <span className="sum-opacity-50">Rule:</span> Match pairs adding up to 10
            </div>
            <div className="sum-footer-item sum-hidden-mobile">
                <span className="sum-opacity-50">Current:</span> Row/Column Only
            </div>
            <div
                className="sum-footer-item sum-hidden-mobile cursor-pointer hover:opacity-80 transition-opacity absolute right-4 sm:right-8"
                onClick={onHint}
            >
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                <span className="text-yellow-200 font-bold uppercase tracking-wider">Hint</span>
            </div>
        </footer>
    );
}
