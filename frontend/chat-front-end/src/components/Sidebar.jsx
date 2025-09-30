import { useMemo, useState } from "react";

const Sidebar = ({ users = [], selectedUser, onSelectUser, loading }) => {
  const [q, setQ] = useState("");

  const list = Array.isArray(users) ? users : [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = !term
      ? list
      : list.filter(
          (u) =>
            u?.fullName?.toLowerCase().includes(term) ||
            u?.email?.toLowerCase().includes(term)
        );
  
    // do NOT mutate base; sort a copy
    const copy = base.slice();
    copy.sort((a, b) => {
      const ta = new Date(a?.lastActivity || a?.updatedAt || a?.createdAt || 0).getTime();
      const tb = new Date(b?.lastActivity || b?.updatedAt || b?.createdAt || 0).getTime();
      if (tb !== ta) return tb - ta;
      return String(a?.fullName || "").localeCompare(String(b?.fullName || ""));
    });
    return copy;
  }, [q, list]);

  return (
    <aside className="w-80 border-r border-base-300 flex flex-col">
      <div className="p-3">
        <input
          className="input input-bordered w-full"
          placeholder="Search users"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="px-3 pb-2 text-xs text-base-content/60">
        {(list?.length ?? 0)} people
      </div>

      <ul className="flex-1 overflow-auto">
        {loading && <li className="px-3 py-2 text-sm text-base-content/60">Loading...</li>}
        {!loading && filtered.length === 0 && (
          <li className="px-3 py-2 text-sm text-base-content/60">No users</li>
        )}
        {!loading &&
          filtered.map((u) => (
            <li
              key={u?._id}
              className={`px-3 py-2 cursor-pointer hover:bg-base-200 ${
                selectedUser?._id === u?._id ? "bg-base-200" : ""
              }`}
              onClick={() => onSelectUser?.(u)}
            >
              <div className="flex items-center gap-3">
                <img
                  className="w-9 h-9 rounded-full object-cover"
                  src={u?.profilePic || "/avatar.png"}
                  alt={u?.fullName || "User"}
                />
                <div className="min-w-0">
                  <div className="truncate">{u?.fullName || "Unknown user"}</div>
                  <div className="text-xs text-base-content/70 truncate">
                    {u?.email || ""}
                  </div>
                </div>
              </div>
            </li>
          ))}
      </ul>
    </aside>
  );
};

export default Sidebar;
