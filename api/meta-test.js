// This file is intentionally empty - debug endpoint removed
export default function handler(req, res) {
  res.status(404).json({ error: "Not found" });
}
