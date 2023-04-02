import dotenv from "dotenv";

dotenv.config();

export function envCheck(requiredKeys) {
  const missingKeys = requiredKeys.filter((key) => !(key in process.env));

  if (missingKeys.length > 0) {
    console.error(
      `The following keys were not found in the .env file: ${missingKeys.join(
        ", "
      )}`
    );
  }
}
