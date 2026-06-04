import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase.ts";

type AuditPayload = {
    action: string;
    target?: string;
    game?: string;
    details?: Record<string, unknown>;
};

export async function writeAdminAudit({ action, target, game, details }: AuditPayload) {
    const user = auth.currentUser;
    await addDoc(collection(db, "adminAudit"), {
        action,
        target: target ?? "",
        game: game ?? "",
        details: details ?? {},
        adminEmail: user?.email ?? "admin",
        adminUid: user?.uid ?? "",
        createdAt: serverTimestamp(),
    });
}
