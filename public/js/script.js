try {
  fetch("/collection/films")
    .then((res) => res.json())
    .then((films) => {
      const list = document.getElementById("films");
      films.forEach((film) => {
        list.innerHTML += `<li><strong>${film.programid}</strong> ${film["file_path"]}</li>`;
      });
    });
} catch (err) {
  console.log("cannot fetch films", err);
}
