export function SummaryView({ summaryId }: { summaryId: string }) {
    return (
        <iframe
            src={`http://142.93.47.187:2027/summary/${summaryId}`}
            style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 'none' }}
        />
    );
}
