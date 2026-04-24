import './App.css';
import { BongoMain }    from "./component/game/BongoMain.tsx";
import { GameInfoDocs } from "./component/docs/GameInfoDocs.tsx";
import { AdminView }    from "./component/admin/AdminView.tsx";

function App() {
    const hash = window.location.hash;
    if (hash === "#/docs")  return <GameInfoDocs />;
    if (hash === "#/admin") return <AdminView />;
    return <BongoMain />;
}

export default App;
