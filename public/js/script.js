async function fetchFilms() {
  try {
    // Fetch films from the API
    const res = await fetch("/collection/films");

    // Check if response is successful (status code 200)
    if (!res.ok) {
      throw new Error("Failed to fetch films");
    }

    // Parse the JSON response
    const films = await res.json();

    // Get the list element
    const list = document.getElementById("films");

    // Clear any previous content (optional)
    list.innerHTML = "";

    // Loop through the films and append them to the list
    films.forEach((film) => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${film.programid}</strong> ${film["file_path"]}`;
      list.appendChild(li);
    });
  } catch (err) {
    // Handle errors
    console.log("Error fetching films:", err);
    const list = document.getElementById("films");
    list.innerHTML = "<li>Error loading films. Please try again later.</li>";
  }
}

fetchFilms();
