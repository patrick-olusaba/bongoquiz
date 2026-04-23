import './App.css';
import { BongoMain }    from "./component/BongoMain.tsx";
import { GameInfoDocs } from "./component/GameInfoDocs.tsx";

function App() {
    const isDocs = window.location.hash === "#/docs";
    return isDocs ? <GameInfoDocs /> : <BongoMain />;
}

export default App;
