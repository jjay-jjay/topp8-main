import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "../AuthContext";
import "./AddTopic.css";

function ManageTopics() {
  const { currentUser } = useAuth();

  const [topics, setTopics] = useState([]);
  const [name, setName] = useState("ຫົວຂໍ້ 1");
  const [description, setDescription] = useState("");
  const [membersPerGroup, setMembersPerGroup] = useState(4);
  const [maxGroups, setMaxGroups] = useState(5);
  const [status, setStatus] = useState("active");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTopics = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "topics"));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTopics(data);
    } catch (err) {
      setError("ไม่สามารถโหลดหัวข้อได้: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!currentUser) {
        setError("กรุณาเข้าสู่ระบบก่อน");
        return;
      }

      const docRef = await addDoc(collection(db, "topics"), {
        name,
        description,
        membersPerGroup: Number(membersPerGroup),
        maxGroups: Number(maxGroups),
        status,
        createdAt: serverTimestamp(),
      });

      setTopics([
        ...topics,
        {
          id: docRef.id,
          name,
          description,
          membersPerGroup,
          maxGroups,
          status,
        },
      ]);

      setName("หัวข้อ 1");
      setDescription("");
      setMembersPerGroup(4);
      setMaxGroups(5);
      setStatus("active");
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเพิ่มหัวข้อ: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบหัวข้อนี้?");
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, "topics", id));
      setTopics(topics.filter((topic) => topic.id !== id));
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการลบ: " + err.message);
    }
  };

  return (
    <div className="manage-topics-container">
      <Link to="/admin" className="manage-topics-back-btn">
        &larr; ກັບໜ້າຫຼັກ
      </Link>

      <h2 className="manage-topics-main-title">ເພີ່ມຫົວຂໍ້ໃໝ່</h2>
      
      {error && <p className="manage-topics-error-msg">{error}</p>}
      
      <form className="manage-topics-form" onSubmit={handleSubmit}>
        <input
          className="manage-topics-form-input"
          type="text"
          placeholder="ชื่อหัวข้อ"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          className="manage-topics-form-input"
          type="number"
          placeholder="สมาชิกต่อกลุ่ม"
          value={membersPerGroup}
          onChange={(e) => setMembersPerGroup(e.target.value)}
          min={1}
          required
        />

        <input
          className="manage-topics-form-input"
          type="number"
          placeholder="จำนวนกลุ่มสูงสุด"
          value={maxGroups}
          onChange={(e) => setMaxGroups(e.target.value)}
          min={1}
          required
        />

        <select 
          className="manage-topics-form-select"
          value={status} 
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>

        <button 
          className="manage-topics-submit-btn" 
          type="submit"
        >
          ບັນທືກຫົວຂໍ້
        </button>
      </form>

      <hr className="manage-topics-divider" />

      <h2 className="manage-topics-sub-title">ລາຍການຫົວຂໍ້ທັງໝົດ</h2>
      
      {loading ? (
        <p className="manage-topics-loading">กำลังโหลด...</p>
      ) : topics.length === 0 ? (
        <p className="manage-topics-empty">ບໍ່ມີຫົວຂໍ້</p>
      ) : (
        <ul className="manage-topics-list">
          {topics.map((topic) => (
            <li className="manage-topics-list-item" key={topic.id}>
              <div className="manage-topics-item-header">
                <h3 className="manage-topics-item-title">{topic.name}</h3>
                <span className={`manage-topics-status-badge ${topic.status}`}>
                  {topic.status}
                </span>
              </div>
              
              <div className="manage-topics-meta-data">
                <span className="manage-topics-meta-item">
                  ສະມາຊິກ/ກຸ່ມ: {topic.membersPerGroup}
                </span>
                <span className="manage-topics-meta-item">
                  ສູງສຸດ: {topic.maxGroups}
                </span>
              </div>
              
              {topic.description && (
                <p className="manage-topics-description">
                  {topic.description}
                </p>
              )}
              
              <button 
                className="manage-topics-delete-btn"
                onClick={() => handleDelete(topic.id)}
              >
                ລົບ
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ManageTopics;