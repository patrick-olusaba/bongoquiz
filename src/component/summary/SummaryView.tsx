export function SummaryView({ summaryId }: { summaryId: string }) {
    return (
        <iframe
            src={`/api/summary/${summaryId}`}
            style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 'none' }}
        />
    );
}
