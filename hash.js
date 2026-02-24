import bcrypt from "bcrypt";

const password = "admin123"; // change this
const hash = await bcrypt.hash(password, 10);

console.log(hash);