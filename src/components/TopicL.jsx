import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import "./TopicL.css";

function TopicL() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);  // A: track first load
  const [clickCount, setClickCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const topicsRef = collection(db, "topics");
    const groupsRef = collection(db, "groups");

    let topicsData = [];
    let groupCountMap = {};

    // A & C: compute pct and manage loading only once
    const updateMerged = () => {
      const merged = topicsData.map(topic => {
        const count = groupCountMap[topic.id] || 0;
        return {
          ...topic,
          groupCount: count,
          pct: (count / topic.maxGroups) * 100  // C: precompute percentage
        };
      });
      setTopics(merged);
      if (!initialized) {
        setLoading(false);
        setInitialized(true);
      }
    };

    // B: use docChanges for topics to update only diffs
    const unsubTopics = onSnapshot(
      topicsRef,
      snapshot => {
        snapshot.docChanges().forEach(change => {
          const doc = { id: change.doc.id, ...change.doc.data() };
          if (change.type === 'added') {
            topicsData.push(doc);
          } else if (change.type === 'modified') {
            const idx = topicsData.findIndex(t => t.id === doc.id);
            if (idx >= 0) topicsData[idx] = doc;
          } else if (change.type === 'removed') {
            topicsData = topicsData.filter(t => t.id !== doc.id);
          }
        });
        updateMerged();
      },
      error => {
        console.error("Error fetching topics:", error);
        if (!initialized) {
          setLoading(false);
          setInitialized(true);
        }
      }
    );

    // D: real-time groups only; merge into topicsData
    const unsubGroups = onSnapshot(
      groupsRef,
      snapshot => {
        groupCountMap = {};
        snapshot.docs.forEach(groupDoc => {
          const data = groupDoc.data();
          const tId = data.topicId?.id || data.topicId;
          if (tId) groupCountMap[tId] = (groupCountMap[tId] || 0) + 1;
        });
        updateMerged();
      },
      error => console.error("Error fetching groups:", error)
    );

    return () => {
      unsubTopics();
      unsubGroups();
    };
  }, [initialized]);

  const handleTitleClick = () => {
    setClickCount(prev => prev + 1);
    if (clickCount + 1 === 5) {
      navigate("/login");
    }
  };

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner" />
      <p>ກຳລັງໂຫຼດຫົວຂໍ້...</p>
    </div>
  );

  return (
    <div className="page-container">
      <h1 className="page-title" onClick={handleTitleClick}>ຫົວຂໍ້ທັງຫມົດ</h1>
      <p className="page-subtitle">ເລືອກຫົວຂໍ້ທີ່ສົນໃຈ ແລະ ຕ້ອງການ</p>

      <div className="topic-grid">
        {topics.map(topic => {
          const isFull = topic.groupCount >= topic.maxGroups;
          const isInactive = topic.status === "inactive";
          return (
            <div key={topic.id} className={`topic-card ${isInactive ? "unavailable" : ""} ${isFull ? "full" : ""}`}>
              <div className="topic-header">
                <h2>{topic.name}</h2>
                {topic.isPopular && <span className="popular-badge">ยอดนิยม</span>}
              </div>

              <div className="topic-content">
                {topic.description && <p className="topic-description">{topic.description}</p>}
                <div className="topic-stats">
                  <div className="topic-stat">
                    <span className="stat-label">ສະຫມັກແລ້ວ</span>
                    <div className="stat-value">
                      <div className="progress-container">
                        {/* C: use precomputed pct */}
                        <div className="progress-bar" style={{ width: `${topic.pct}%` }} />
                      </div>
                      <span>{topic.groupCount}/{topic.maxGroups} ກຸ່ມ</span>
                    </div>
                  </div>
                  <div className="topic-stat">
                    <span className="stat-label">ສະມາຊິກຕໍ່ກຸ່ມ</span>
                    <span className="stat-value">{topic.membersPerGroup} ຄົນ</span>
                  </div>
                </div>
              </div>

              <div className="topic-footer">
                {isInactive && <div className="status-badge closed">ປິດຮັບສະໝັກ</div>}
                {isFull && !isInactive && <div className="status-badge full">ເຕັມ</div>}
                {!isInactive && <Link to={`/topics/${topic.id}`} className="view-button">{isFull ? "ເບິ່ງລາຍລະອຽດ" : "ສະຫມັກ"}</Link>}
              </div>
            </div>
          );
        })}
      </div>

      {topics.length === 0 && (
        <div className="empty-state">
          <p>ບໍ່ພົບຫົວຂໍ້ໃຫ້ເປີດລົງທະບຽນ</p>
        </div>
      )}
    </div>
  );
}

export default TopicL;
