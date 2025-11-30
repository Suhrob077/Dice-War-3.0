// OpenCaseMotion.jsx
import React from "react";
import { motion } from "framer-motion";
import FallbackImage from "../../FallbackImage";
import "./OpenCase.css";

export default function OpenCaseMotion({ chest, openedArtifact, onClose }) {
  const stats = openedArtifact.status || openedArtifact;

  const leftStats = [];
  const rightStats = [];

  if (stats.attack > 0) leftStats.push({ label: "ATK", value: stats.attack });
  if (stats.defense > 0) rightStats.push({ label: "DEF", value: stats.defense });
  if (stats.health > 0) leftStats.push({ label: "HP", value: stats.health });
  if (stats.attack_bonus > 0) rightStats.push({ label: "ATK Bonus", value: stats.attack_bonus });
  if (stats.defense_bonus > 0) leftStats.push({ label: "DEF Bonus", value: stats.defense_bonus });
  if (stats.health_bonus > 0) rightStats.push({ label: "HP Bonus", value: stats.health_bonus });

  return (
    <motion.div
      className="open-case-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="open-case-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.3, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.9, type: "spring", stiffness: 200, damping: 20 }}
      >
        {/* Epik sarlavha */}
        <motion.h2
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 150 }}
        >
          {chest.name} OCHILDI!
        </motion.h2>

        {/* MARKAZDAGI ARTIFACT — ZOʻR ANIMATSIYA */}
        <motion.div
          initial={{ scale: 0, rotateY: 360 }}
          animate={{ scale: 1, rotateY: 0 }}
          transition={{ delay: 0.6, duration: 1.2, type: "spring", stiffness: 100 }}
          className="artifact-wrapper"
        >
          <div className="artifact-glow" />
          <FallbackImage
            src={openedArtifact.img_url}
            alt={openedArtifact.name}
            className="artifact-img"
          />
        </motion.div>

        <motion.h3
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
        >
          {openedArtifact.name}
        </motion.h3>

        {/* STATLAR CHAP VA OʻNGDAN UCHIB CHIQADI */}
        <div className="stats-wrapper">
          <div className="stats-left">
            {leftStats.map((stat, i) => (
              <motion.div
                key={"l" + i}
                className="stat-box"
                initial={{ x: -400, opacity: 0, rotate: -120 }}
                animate={{ x: 0, opacity: 1, rotate: 0 }}
                transition={{ delay: 1.6 + i * 0.2, type: "spring", stiffness: 120 }}
              >
                <span>{stat.label}</span>
                <span className="value">+{stat.value}</span>
              </motion.div>
            ))}
          </div>

          <div className="stats-right">
            {rightStats.map((stat, i) => (
              <motion.div
                key={"r" + i}
                className="stat-box"
                initial={{ x: 400, opacity: 0, rotate: 120 }}
                animate={{ x: 0, opacity: 1, rotate: 0 }}
                transition={{ delay: 1.6 + i * 0.2, type: "spring", stiffness: 120 }}
              >
                <span>{stat.label}</span>
                <span className="value">+{stat.value}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Maxfiy qobiliyat */}
        {openedArtifact.skill && (
          <motion.p
            className="skill-text"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 2.4, type: "spring", stiffness: 200 }}
          >
            Maxfiy Qobiliyat: {openedArtifact.skill}
          </motion.p>
        )}

        {/* Tugma */}
        <motion.button
          className="close-btn"
          onClick={onClose}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 2.6, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
        >
          Yopish
        </motion.button>
      </motion.div>
    </motion.div>
  );
}