import {  HashRouter as Router, Routes, Route } from "react-router-dom";
import TopicL from "./components/TopicL";
import MemberInput from "./components/MemberInput";
import Login from "./components/Login";
import AddTopic from "./components/AddTopic";
import Admin from "./components/Admin";
import ManageGroups from "./components/ManagaGroups";
import ExportSheet from "./components/ExportSheet";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/" element={<TopicL />} />
        <Route path="/topics/:topicId" element={<MemberInput />} />
        <Route path="/add-topic" element={<AddTopic />} />
        <Route path="/groups" element={<ManageGroups />} />
        <Route path="/export-sheet" element={<ExportSheet />} />
      </Routes>
    </Router>
  );
}

export default App;
