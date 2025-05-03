import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import "./ManageGroups.css";
import { Link } from "react-router-dom";

function ManageGroups() {
  const [topics, setTopics] = useState([]);
  const [allGroups, setAllGroups] = useState([]);  // state for all groups
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editedGroup, setEditedGroup] = useState({ members: [], status: "active" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch topics
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const snap = await getDocs(collection(db, "topics"));
        setTopics(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        setError("โหลดหัวข้อไม่สำเร็จ: " + err.message);
      }
    };
    fetchTopics();
  }, []);

  // Fetch all groups (for counting)
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const snap = await getDocs(collection(db, "groups"));
        setAllGroups(
          snap.docs.map(d => ({ id: d.id, topicId: d.data().topicId.id }))
        );
      } catch (err) {
        console.error("Error fetching all groups:", err);
      }
    };
    fetchAll();
  }, []);

  // count groups per topic
  const countByTopic = useMemo(() => {
    return allGroups.reduce((acc, g) => {
      acc[g.topicId] = (acc[g.topicId] || 0) + 1;
      return acc;
    }, {});
  }, [allGroups]);

  // Fetch groups for selected topic
  const fetchGroupsByTopic = async topicId => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "groups"),
        where("topicId", "==", doc(db, "topics", topicId))
      );
      const snap = await getDocs(q);
      setGroups(
        snap.docs.map(d => ({ id: d.id, members: d.data().members || [], status: d.data().status || "active" }))
      );
    } catch (err) {
      setError("โหลดกลุ่มไม่สำเร็จ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTopicId) fetchGroupsByTopic(selectedTopicId);
  }, [selectedTopicId]);

  const handleEdit = group => {
    setEditingGroupId(group.id);
    setEditedGroup({ members: group.members, status: group.status });
  };

  const handleSave = async () => {
    try {
      const validMembers = editedGroup.members.filter(m => m.trim() !== "");
      const updates = { members: validMembers, status: editedGroup.status };
      await updateDoc(doc(db, "groups", editingGroupId), updates);
      setGroups(gs => gs.map(g => (g.id === editingGroupId ? { ...g, ...updates } : g)));
      setEditingGroupId(null);
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบกลุ่มนี้?")) return;
    try {
      await deleteDoc(doc(db, "groups", id));
      // update local lists
      setGroups(gs => gs.filter(g => g.id !== id));
      setAllGroups(ags => ags.filter(g => g.id !== id)); // also update allGroups
    } catch (err) {
      alert("ไม่สามารถลบกลุ่มได้: " + err.message);
    }
  };

  return (
    <div className="manage-groups-container">
      <div className="back-button-container">
        <Link to="/admin" className="back-button">
          &larr; ກັບໜ້າຫຼັກ
        </Link>
      </div>
      <h2 className="manage-groups-title">ຈັດການກຸ່ມ</h2>
      {error && <p className="manage-groups-error">{error}</p>}

      <div className="manage-groups-topic-select">
        <label>
          ເລືອກຫົວຂໍ້
          {selectedTopicId && <span> ({groups.length} ກຸ່ມ)</span>}
          :
        </label>
        <select value={selectedTopicId || ""} onChange={e => setSelectedTopicId(e.target.value)}>
          <option value="" disabled>
            -- ເລືອກຫົວຂໍ້ --
          </option>
          {topics.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} ({countByTopic[t.id] || 0} ກຸ່ມ)
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="manage-groups-loading">...</p>
      ) : groups.length === 0 ? (
        <p className="manage-groups-empty">ไม่มีกลุ่มในหัวข้อนี้</p>
      ) : (
        <ul className="manage-groups-list">
          {groups.map(group =>
            editingGroupId === group.id ? (
              <li key={group.id} className="manage-groups-edit-item">
                {/* edit form */}
                <div className="form-group">
                  <label>ສະມາຊິກ:</label>
                  {editedGroup.members.map((m, i) => (
                    <input
                      key={i}
                      type="text"
                      value={m}
                      onChange={e => {
                        const arr = [...editedGroup.members];
                        arr[i] = e.target.value;
                        setEditedGroup({ ...editedGroup, members: arr });
                      }}
                    />
                  ))}
                </div>
                <div className="form-group">
                  <label>ສະຖານະ:</label>
                  <select
                    value={editedGroup.status}
                    onChange={e => setEditedGroup({ ...editedGroup, status: e.target.value })}
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </div>
                <div className="manage-groups-action-btns">
                  <button className="edit-button" onClick={handleSave}>
                    ບັນທຶກ
                  </button>
                  <button className="delete-button" onClick={() => setEditingGroupId(null)}>
                    ຍົກເລີກ
                  </button>
                </div>
              </li>
            ) : (
              <li key={group.id} className="manage-groups-list-item">
                <p>ສະມາຊິກ:</p>
                <ul className="manage-groups-members">
                  {group.members.map((member, idx) => (
                    <li key={idx} className="member-item">
                      {member}
                    </li>
                  ))}
                </ul>
                <p>ສະຖານະ: {group.status}</p>
                <div className="manage-groups-actions">
                  <button className="edit-button" onClick={() => handleEdit(group)}>
                    ແກ້ໄຂ
                  </button>
                  <button className="delete-button" onClick={() => handleDelete(group.id)}>
                    ລົບ
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

export default ManageGroups;
