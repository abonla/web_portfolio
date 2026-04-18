function parseWorkExperience($, $table) {
  const rows = [];
  $table.find('tr').each((_, tr) => {
    const cells = $(tr).find('td, th');
    if (cells.length >= 3) {
      rows.push({
        period: $(cells[0]).text().trim(),
        company: $(cells[1]).text().trim(),
        title: $(cells[2]).text().trim(),
      });
    }
  });
  return rows;
}

function parseSkills($, $table) {
  const skills = [];
  $table.find('tr').each((_, tr) => {
    const cells = $(tr).find('td');
    if (cells.length >= 2) {
      const name = $(cells[0]).text().trim();
      const starsText = $(cells[1]).text();
      const stars = (starsText.match(/[⭐★]/g) || []).length;
      if (name) skills.push({ name, stars });
    }
  });
  return skills;
}

module.exports = { parseWorkExperience, parseSkills };
