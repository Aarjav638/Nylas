import fs from "fs";

const getGrantId = async (Email) => {
  const filePath = "data.json";
  try {
    let fileContent = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, "utf8")
      : "[]";

    let dataArray = JSON.parse(fileContent);

    if (!Array.isArray(dataArray)) {
      throw new Error("The file does not contain a valid JSON array.");
    }

    const user = dataArray.find((item) => item.email == Email);
    console.log("555555555", user);
    const grantId = user.grantId;
    return grantId;
  } catch (error) {
    console.error(`${error}`.red);
  }
};

export { getGrantId };
