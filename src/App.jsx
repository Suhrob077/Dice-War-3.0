// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MainShop from "./components/MainShop/MainShop.jsx"
// Fayllaringni o‘zingdagi joylashuvga qarab moslab qo‘y
import MainMenu from "./Beta/MainMenu/MainMenu";
import Start from "./Beta/Start/start";
import Login from "./Beta/Start/login";
import MainInventory from "./components/Main-Inventory/MainInventory.jsx"
import SelectHero from "./Beta/Start/HerosPage";
import Rank$ from "./components/Ranks/Rank.jsx"
import Register from "./Beta/Start/Register"
import MainQuest from"./components/Quests/MainQuest.jsx"



function App() {
  return (
    <Router>
      <Routes>
        {/* Loader/Start sahifasi */}
        <Route path="/" element={<Start />} />

        {/* Login sahifasi */}
        <Route path="/login" element={<Login />} />

        {/* Qahramon tanlash */}
        <Route path="/select-hero" element={<SelectHero />} />
        <Route path="/register" element={<Register/>} />
        <Route path="/mainmenu" element={<MainMenu/>} />
        <Route path="/mainshop" element={<MainShop/>} />
        <Route path="/maininventor" element={<MainInventory/>} />
        <Route path="/main-quest" element={<MainQuest />} />
        <Route path="/Global-Rank" element={<Rank$ />} />

        {/* Keyinchalik qo‘shiladigan sahifa */}
        {/* <Route path="/home" element={<Home />} /> */}

        {/* Noto‘g‘ri URL kelsa -> Start ga yuboradi */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;


