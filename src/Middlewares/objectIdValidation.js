import { ObjectId } from "mongodb";

export default function objectIdValidation(req, res, next, id) {
  if (!ObjectId.isValid(id)) {
    return res.status(401).json({ error: "Invalid Id in params" });
  }
  next();
}
