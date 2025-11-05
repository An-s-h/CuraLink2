import React from "react";

export default function Footer() {
  return (
    <footer className="relative w-full pb-10 text-center text-orange-800 ">
      © {new Date().getFullYear()}{" "}
      <span className="lobster-two-regular">CuraLink</span> — Bridging Patients
      & Researchers
    </footer>
  );
}
