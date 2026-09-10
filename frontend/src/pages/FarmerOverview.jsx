import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getCurrentPrice } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const cropSeeds = [
  { name: "Wheat", icon: "🌾", mandi: "Nearby Mandi", tone: "green", movement: [42, 44, 43, 47, 49, 52, 55] },
  { name: "Onion", icon: "🧅", mandi: "Local APMC", tone: "gold", movement: [58, 56, 55, 53, 54, 51, 49] },
  { name: "Soybean", icon: "🌱", mandi: "Ujjain Mandi", tone: "blue", movement: [35, 37, 39, 38, 42, 44, 46] },
];

const recentActivity = [
  { icon: "🌾", title: "Wheat listing", detail: "Awaiting buyer interest", status: "Draft" },
  { icon: "🤝", title: "Buyer interest", detail: "New activity will appear here", status: "Watching" },
  { icon: "₹", title: "Bids received", detail: "Connect a listing to see bids", status: "Pending" },
];

export default function FarmerOverview() {
  const { profile } = useAuth();
  const [selectedCrop, setSelectedCrop] = useState("Wheat");
  const [prices, setPrices] = useState({});

  useEffect(() => {
    cropSeeds.forEach((crop) => {
      getCurrentPrice(crop.name, { district: profile?.district || "Ujjain" })
        .then((data) => setPrices((current) => ({ ...current, [crop.name]: data })))
        .catch(() => {});
    });
  }, [profile?.district]);

  const displayFarmer = profile || {
    name: "Farmer profile",
    phone: "",
    village: "Your village",
    district: "Your district",
    state: "Your state",
    farmer_type: "Not set",
    land_area: null,
    main_crops: "Add your crops",
  };
  const selected = cropSeeds.find((crop) => crop.name === selectedCrop) || cropSeeds[0];
  const selectedPrice = prices[selected.name];
  const completion = profile ? 100 : 28;
  const maskMobile = displayFarmer.phone ? `${displayFarmer.phone.slice(0, 3)}••••••${displayFarmer.phone.slice(-2)}` : "Not added";

  return (
    <div className="farmer-dashboard">
      <section className="farmer-welcome">
        <div>
          <p className="dashboard-kicker">Your digital mandi companion</p>
          <h1>Namaste, {displayFarmer.name} <span aria-hidden="true">👋</span></h1>
          <p>Here&apos;s what&apos;s happening in your local agricultural market today.</p>
        </div>
        <div className="welcome-weather" aria-label="Local market status">
          <span>☀️</span><strong>Market day</strong><small>Stay informed, sell smarter</small>
        </div>
      </section>

      <section className="farmer-dashboard-grid">
        <aside className="farmer-profile-card dashboard-card">
          <div className="profile-card-heading"><span className="profile-avatar">👨🏽‍🌾</span><div><p className="dashboard-label">Farmer profile</p><h2>{displayFarmer.name}</h2></div></div>
          <div className="profile-fields">
            <ProfileField label="Mobile number" value={maskMobile} />
            <ProfileField label="Village" value={displayFarmer.village} />
            <ProfileField label="District" value={displayFarmer.district} />
            <ProfileField label="State" value={displayFarmer.state} />
            <ProfileField label="Farmer type" value={displayFarmer.farmer_type} />
            <ProfileField label="Land area" value={displayFarmer.land_area ? `${displayFarmer.land_area} acres` : "Not added"} />
            <ProfileField label="Main crops" value={displayFarmer.main_crops || "Not added"} />
          </div>
          <div className="profile-completion"><div><span>Profile completion</span><strong>{completion}%</strong></div><div className="completion-track"><span style={{ width: `${completion}%` }} /></div></div>
        </aside>

        <div className="dashboard-main-column">
          <section className="dashboard-section mandi-section">
            <div className="section-heading"><div><p className="dashboard-kicker">Live market watch</p><h2>Today&apos;s Mandi Trends</h2></div><Link to="/prices" className="text-action">View all prices <span>→</span></Link></div>
            <div className="crop-card-grid">
              {cropSeeds.map((crop) => <CropCard key={crop.name} crop={crop} price={prices[crop.name]} active={selectedCrop === crop.name} onClick={() => setSelectedCrop(crop.name)} />)}
            </div>
            <div className="trend-panel dashboard-card">
              <div className="trend-panel-heading"><div><span className="crop-icon">{selected.icon}</span><div><p className="dashboard-label">Recent movement</p><h3>{selected.name} price trend</h3></div></div><span className="trend-live">● Live feed</span></div>
              <div className="trend-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={selected.movement.map((value, index) => ({ day: `-${6 - index}d`, value }))} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#7b8d78", fontSize: 10 }} /><YAxis hide domain={[30, 65]} /><Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #dce8d8", boxShadow: "0 8px 22px rgba(29, 75, 42, .12)" }} formatter={(value) => [`${value} index`, "Movement"]} /><Line type="monotone" dataKey="value" stroke="#287044" strokeWidth={3} dot={{ r: 3, fill: "#e0a52c", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div>
              <p className="chart-note">Price values will populate from the connected mandi feed. This chart currently shows movement direction only.</p>
            </div>
          </section>

          <section className="opportunity-banner"><div className="opportunity-icon">🌾</div><div><p className="dashboard-kicker">Market opportunity</p><h2>Good Time to Sell</h2><p><strong>Wheat</strong> is showing a favorable movement pattern in the selected market.</p></div><Link to="/prices" className="primary-action">View Market <span>→</span></Link></section>

          <section className="dashboard-section"><div className="section-heading"><div><p className="dashboard-kicker">At a glance</p><h2>Quick Actions</h2></div></div><div className="quick-action-grid"><QuickAction icon="🌾" label="Sell Your Crop" to="/farmer" tone="green" /><QuickAction icon="📈" label="View Mandi Prices" to="/prices" tone="gold" /><QuickAction icon="🤝" label="Find Buyers" to="/marketplace" tone="blue" /><QuickAction icon="📋" label="My Listings" to="/marketplace" tone="earth" /></div></section>

          <section className="dashboard-section"><div className="section-heading"><div><p className="dashboard-kicker">Your activity</p><h2>Recent Activity</h2></div><Link to="/marketplace" className="text-action">Open marketplace <span>→</span></Link></div><div className="activity-list">{recentActivity.map((item) => <div className="activity-row" key={item.title}><span className="activity-icon">{item.icon}</span><div><strong>{item.title}</strong><p>{item.detail}</p></div><span className="activity-status">{item.status}</span></div>)}</div></section>
        </div>
      </section>
    </div>
  );
}

function ProfileField({ label, value }) { return <div className="profile-field"><span>{label}</span><strong>{value}</strong></div>; }
function QuickAction({ icon, label, to, tone }) { return <Link to={to} className={`quick-action ${tone}`}><span>{icon}</span><strong>{label}</strong><b aria-hidden="true">↗</b></Link>; }
function CropCard({ crop, price, active, onClick }) {
  const current = price?.current_price_per_quintal;
  const change = price?.change_percent;
  return <button type="button" className={`crop-card ${crop.tone} ${active ? "active" : ""}`} onClick={onClick}><div className="crop-card-top"><span className="crop-icon">{crop.icon}</span><span className="trend-arrow">{change >= 0 ? "↗" : "↘"}</span></div><h3>{crop.name}</h3><strong>{current ? `₹${Number(current).toLocaleString("en-IN")}` : "Awaiting feed"}</strong><small>{current ? "/ Quintal" : "Live price placeholder"}</small><p className={change >= 0 ? "positive" : "neutral"}>{change ? `${change > 0 ? "↑" : "↓"} ${Math.abs(change)}% today` : "Trend data pending"}</p><em>Mandi: {price?.mandi_name || crop.mandi}</em></button>;
}
