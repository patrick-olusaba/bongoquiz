import type {FC} from "react";
import {MainGameLayout} from "./components/MainGameLayout.tsx";
import chezaTenaAd from "../../assets/cheza-tena-ad.jpeg";
import "./App.css"

const App: FC = () => {
    return(
        <>
            <MainGameLayout/>
            <a href="https://tushinde.com/" target="_blank" rel="noopener noreferrer"
                style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999, display: "block" }}>
                <div style={{ position: "relative", width: "100%", maxWidth: 800, margin: "0 auto" }}>
                    <img src={chezaTenaAd} alt="Cheza Tena"
                        style={{ width: "100%", display: "block", maxHeight: 56, objectFit: "cover", objectPosition: "center" }} />
                    <button
                        aria-label="Close ad"
                        style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.55)", border: "none",
                            borderRadius: "50%", width: 20, height: 20, color: "#fff", fontSize: "0.65rem",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        onClickCapture={e => { e.preventDefault(); e.stopPropagation(); (e.currentTarget.closest("a") as HTMLElement | null)?.remove(); }}>
                        ✕
                    </button>
                </div>
            </a>
        </>
       )
};

export default App;