function updateBodiesList(bodies) {
    const bodiesList = document.getElementById("body-list");
    bodiesList.innerHTML = "";
    bodies.map(body => {
        const li = document.createElement("li");
        li.innerHTML = `<span style="color: ${body.color};">${body.name}</span>`;
        bodiesList.appendChild(li);
    });
}

export {updateBodiesList};