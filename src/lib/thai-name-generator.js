function pickRandom(list, random) {
  return list[Math.floor(random() * list.length)];
}

function generateThaiCitizenNumber(random) {
  const baseDigits = Array.from({ length: 12 }, () =>
    Math.floor(random() * 10)
  );
  const weightedSum = baseDigits.reduce(
    (sum, digit, index) => sum + digit * (13 - index),
    0
  );
  const checksum = (11 - (weightedSum % 11)) % 10;

  return [...baseDigits, checksum].join("");
}

export function generateThaiName(data, random = Math.random) {
  const gender = random() < 0.5 ? "female" : "male";
  const firstnames =
    gender === "female" ? data.firstnameFemale : data.firstnameMale;
  const nicknames =
    gender === "female" ? data.nicknameFemale : data.nicknameMale;
  const lastnames = data.lastname;

  if (!firstnames?.length || !nicknames?.length || !lastnames?.length) {
    throw new Error("Missing required thai name data.");
  }

  const firstname = pickRandom(firstnames, random).th.trim();
  const lastname = pickRandom(lastnames, random).th.trim();
  const nickname = pickRandom(nicknames, random).th.trim();
  const fullName = `${firstname} ${lastname}`;

  return {
    citizenNumber: generateThaiCitizenNumber(random),
    gender,
    firstname,
    lastname,
    nickname,
    fullName,
    displayName: `${fullName} (${nickname})`,
  };
}
