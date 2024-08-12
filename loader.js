// certainly not my greatest work
// i can do better than this i swear it's just because i'm tired
var modMenuContainer = document.querySelector(".mods")
window.closeModMenu = () => {
    modMenuContainer.classList.remove("active");
}
modMenuContainer.querySelector("input").addEventListener("keyup", (e) => {
    if (e.key !== "Enter" && e.key !== "Return")
        return;
    // OK ok ngl i don't really know how to use regex :sob: i'm sorry
    const repoName = modMenuContainer.querySelector("input")
        .value.replaceAll("https://github.com/", "").replaceAll("github.com/", "");
    modMenuContainer.querySelector("input").value = "";
    fetch(`https://raw.githubusercontent.com/${repoName}/main/mod.json`)
        .then(async data => {
            if (data.status != 200) {
                alert("Please ensure you entered the correct repo name and that you don't include the entire URL")
                return;
            }
            try {
                var modData = JSON.parse(await data.text());
                var awaitingPromises = [];
                Object.keys(modData).forEach(async code => {
                    var codeData = modData[code];
                    if (!codeData.file) {
                        alert("This mod has an error, and may not be loaded properly.");
                        return
                    }
                    var uri = new URL(codeData.file, `https://raw.githubusercontent.com/${repoName}/main/`)
                    var promise = fetch(uri.href)
                    awaitingPromises.push(promise);
                    var fileData = await promise;
                    if (fileData.status != 200) {
                        alert("This mod has an error, and will not be loaded.")
                        return;
                    }
                    var blobPromise = fileData.blob();
                    awaitingPromises.push(blobPromise);
                    var blob = await blobPromise;
                    awaitingPromises.push(
                        window.addFileToModList(blob, codeData.file, code, repoName)
                    )
                })
            } catch(err) {
                alert("This mod has an error, and will not be loaded.");
                console.log(err);
                return;
            }
        })
})

var request = indexedDB.open("mods", 1);
request.onerror = e => {
    
}
request.onsuccess = e => {
    db = e.target.result;
    initApp();
    window.addFileToModList = (blob, fileName, code, source) => {
        return new Promise(res => {
            const objectStore = db
                .transaction("codes", "readwrite")
                .objectStore("codes");
            objectStore.add({
                file: blob, fileName, code: code.replace(/[^a-z0-9?]/gi, '').toLowerCase(), source
            })
            window.reloadModList();
            res();
        })
    }
    window.reloadModList = () => {
        modMenuContainer.querySelector(".mods-list").innerHTML = "";
        var request = db.transaction(["codes"])
            .objectStore("codes")
            .openCursor();
        var i = 0;
        request.onsuccess = e => {
            let cursor = e.target.result;
            if (cursor) {
                const code = cursor.primaryKey;
                var a = document.createElement("a");
                a.classList.add("mod-list-item")
                a.innerText = `- ${cursor.primaryKey} (${cursor.value.source})`
                a.addEventListener("click", (e) => {
                    const request = db
                        .transaction(["codes"], "readwrite")
                        .objectStore("codes")
                        .delete(code);
                    request.onsuccess = (event) => {
                        window.reloadModList();
                    };

                })
                modMenuContainer.querySelector(".mods-list").appendChild(a);
                cursor.continue(); i++;
            } else {
                if (i < 1) {
                    modMenuContainer.querySelector(".mods-list").innerHTML = "You have no mods installed! Install one!!!";
                }
            }
        }
    }
    window.addEventListener("message", (e) => {
        try {
            var data = JSON.parse(e.data);
            switch (data.status) {
                case "checkForMod":
                    if (data.code == "mods") {
                        reloadModList();
                        modMenuContainer.classList.add("active");
                        e.source.postMessage(JSON.stringify({
                            status: "checkForMod",
                            response: true,
                            file: URL.createObjectURL(new Blob([`<div class="hidden has-text" data-controller="content" data-text="SKIBIDI DOP DOP"></div>`], {type: "text/html"})),
                            fileName: "mods.html"
                        }))
                        return;
                    }
                    var transaction = db.transaction(["codes"]);
                    var store = transaction.objectStore("codes");
                    var request = store.get(data.code.replace(/[^a-z0-9?]/gi, '').toLowerCase());
                    request.onerror = evt => {
                        console.log(e)
                    }
                    request.onsuccess = evt => {
                        if (request.result) {
                            e.source.postMessage(JSON.stringify({
                                status: "checkForMod",
                                response: true,
                                file: URL.createObjectURL(request.result.file),
                                fileName: request.result.fileName
                            }))
                        } else
                            e.source.postMessage(JSON.stringify({
                                status: "checkForMod",
                                response: false
                            }))
                    }
                    break;
            }
        } catch(err) {}
    })
    console.log("Database ready!")
}
request.onupgradeneeded = e => {
    const db = e.target.result;
  
    // Create an objectStore for this database
    const objectStore = db.createObjectStore("codes", { keyPath: "code" });
    objectStore.createIndex("file", "file", { unique: false });
    objectStore.createIndex("fileName", "fileName", { unique: false });
    objectStore.createIndex("source", "source", { unique: false });

    objectStore.transaction.oncomplete = e => {
        console.log("Database built!")
    }
};