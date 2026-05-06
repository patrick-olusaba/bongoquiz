import type {FC} from "react";
import {MainGameLayout} from "./components/MainGameLayout.tsx";
import { BottomNav } from "../game/BottomNav.tsx";
import "./App.css"

const App: FC = () => {
    return(
        <>
            <MainGameLayout/>
            <BottomNav active="games" onNavigate={(tab) => {
                if (tab === 'home') window.location.href = '/';
                else if (tab === 'games') window.location.href = '/';
                else if (tab === 'leaderboard') window.dispatchEvent(new CustomEvent('show-leaderboard'));
            }} />
        </>
       )
};

export default App;