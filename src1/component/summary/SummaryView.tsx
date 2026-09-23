export function SummaryView({ summaryId }: { summaryId: string }) {
    const src = import.meta.env.DEV
        ? `http://142.93.47.187:2027/summary/${summaryId}`
        : `/api/summary/${summaryId}`;
    return (
        <iframe
            src={src}
            style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 'none' }}
        />
    );
}
