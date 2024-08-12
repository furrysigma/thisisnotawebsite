var baseDocument = "https://raw.githubusercontent.com/furrysigma/archive/main/domains/thisisnotawebsitedotcom.com/assets/%E2%96%B3.htm";
var mimetypes = {
    "html" : "text/html",
    "css": "text/css",
    "js": "application/javascript"
}
var patchNoteDocument = (docBlob) => {
    var patchUrl = (url) => {
        if (url.substr(0, 5) === "data:")
            return url;
        var url = new URL(url, "https://thisisnotawebsitedotcom.com");
        if (url.hostname != "thisisnotawebsitedotcom.com")
            return url;
        return `https://raw.githubusercontent.com/furrysigma/archive/main/domains/thisisnotawebsitedotcom.com${url.pathname}`
    }
    var document = (new DOMParser()).parseFromString(docBlob, "text/html");
    document.querySelectorAll("img").forEach(img => img.src = patchUrl(img.getAttribute("src")));
    document.querySelectorAll("video, audio").forEach(videoElem => {
        if (videoElem.children.length > 0) {
            videoElem.children[0].src = patchUrl(videoElem.children[0].getAttribute("src"))
        } else
            videoElem.src = patchUrl(videoElem.getAttribute("src"))
    });
    document.querySelectorAll("*[data-links]").forEach(link => link.dataset.links = patchUrl(link.dataset.links));
    return new Blob([document.documentElement.innerHTML], {type: "text/html"})
}
var patchDocument = async (htm) => { 
    return new Promise(async resolve => {
        var payloadString = await fetch(`payload.js`).then(_ => _.text())
        var cache = await caches.open("v1")

        var document = (new DOMParser()).parseFromString(htm, "text/html");
        var promises = [];
        var patch = async (path) => {
            if (path.length < 1)
                return new Promise(res => res(""));
            var promise = new Promise(async resolve => {
                var uri = new URL(
                    path, 
                    location.href
                );
                if (uri.host != location.host)
                    return resolve(path);
                var archiveUri = `https://raw.githubusercontent.com/furrysigma/archive/main/domains/thisisnotawebsitedotcom.com${uri.pathname}`;
                var extension = uri.pathname.split(".");
                var blob = await new Promise(async res => {
                    var match = await cache.match(archiveUri);
                    if (!!match)
                    {
                        console.log("Using cached data for " + uri.pathname)
                        return res(await match.blob());
                    }

                    var data = await fetch(archiveUri).then(_ => _.blob());
                    cache.put(new Request(archiveUri), new Response(data, {status: 200}));
                    res(data);
                });
                if (!!blob)
                {
                    if (mimetypes[extension[extension.length - 1]] == "text/html")
                        blob = patchNoteDocument(await blob.text())
                    blob = blob.slice(0, blob.size, mimetypes[extension[extension.length - 1]] || "text/plain")
                    resolve(URL.createObjectURL(blob))
                } else
                    resolve("");
            })
            promises.push(promise)
            return promise
        }  
        document.querySelectorAll("video, audio").forEach(async videoElem => {
            if (videoElem.children.length > 0) {
                videoElem.children[0].src = await patch(videoElem.children[0].getAttribute("src"))
            } else
                videoElem.src = await patch(videoElem.getAttribute("src"))
        })
        document.querySelectorAll("img, script").forEach(async imageElem => 
            imageElem.src = await patch(imageElem.src));
        document.querySelectorAll("link, a").forEach(async linkElem => 
            linkElem.href = await patch(linkElem.href));
        document.querySelectorAll("*[data-content]").forEach(async linkElem => 
            linkElem.dataset.content = await patch(linkElem.getAttribute("data-content")));
        document.querySelectorAll("*[data-image]").forEach(async linkElem => 
            linkElem.dataset.image = await patch(linkElem.getAttribute("data-image")));
        
        var script = document.createElement("script");
        script.textContent = payloadString;
        document.head.appendChild(script);

        await Promise.all(promises);
        resolve(URL.createObjectURL(new Blob([document.documentElement.innerHTML], {
            type: "text/html"
        })))
    })
};
const initApp = () => {
    fetch(baseDocument)
        .then(_ => _.text())
        .then(async htm => {
            document.querySelector("iframe").src =
                await patchDocument(htm);
        })
}