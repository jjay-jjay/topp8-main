import React, { useEffect } from "react";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import "./Admin.css";

function Admin() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, [currentUser, navigate]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="admin-container">
      <div className="admin-card">
        <h2>Admin Dashboard</h2>
        <p>Welcome {currentUser.email}</p>

        <button
          onClick={() => navigate("/add-topic")}
          className="admin-button"
        >
          ຈັດການຫົວຂໍ້
        </button>

        <button
          onClick={() => navigate("/groups")}
          className="admin-button"
        >
          ຈັດການກຸ່ມ
        </button>

        <button
          onClick={() => navigate("/export-sheet")}
          className="admin-button"
        >
          📤 ສົ່ງອອກຂໍ້ມູນ
        </button>

        {/* New button to navigate to TopicL */}
        <button
          onClick={() => navigate("/")}
          className="admin-button"
        >
          ກັບໄປຫົວຂໍ້
        </button>
      </div>
    </div>
  );
}

export default Admin;
