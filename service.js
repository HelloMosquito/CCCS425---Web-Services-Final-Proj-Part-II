const express = require("express");
const app = express();
let morgan = require("morgan");
let cors = require("cors");
const bodyParser = require("body-parser");
const { truncate } = require("fs");
app.use(bodyParser.raw({ type: "*/*" }));
app.use(morgan("combined"));
app.use(cors());

app.get("/sourcecode", (req, res) => {
    res.send(require('fs').readFileSync(__filename).toString())
});

let users = new Map();
let tokens = new Map();
let listing = new Map();
let cart = new Map();
let purchaseHistory = new Map();
let chatMessages = new Map();
let shipStatus = new Map();
let reviews = new Map();

let getUsernameByToken = (tokens, targetToken) => {
    for (let [k, v] of tokens.entries()) {
        if (v === targetToken) {
            return k;
        }
    }
};

let checkMissingUsername = (username, res) => {
    if (username === undefined) {
        res.send({ "success": false, "reason": "username field missing" });
        return true;
    }
    return false;
}

let checkMissingPassword = (password, res) => {
    if (password === undefined) {
        res.send({ "success": false, "reason": "password field missing" });
        return true;
    }
    return false;
}

let checkExistedRegisteredUser = (username, users, res) => {
    if (users.has(username)) {
        res.send({ "success": false, "reason": "Username exists" });
        return true;
    }
    return false;
}

let signup = (username, password, res) => {
    users.set(username, password);
    res.send({ "success": true });
}

let checkLoginNotExistedUser = (username, users, res) => {
    if (!users.has(username)) {
        res.send({ "success": false, "reason": "User does not exist" });
        return true;
    }
    return false;
}

let checkLoginInvalidPassword = (username, password, users, res) => {
    if (password !== users.get(username)) {
        res.send({ "success": false, "reason": "Invalid password" });
        return true;
    }
    return false;
}

let login = (username, password, tokens, res) => {
    let token =
        username.substr(
            parseInt(Math.random() * username.length, 10) + 1,
            parseInt(Math.random() * username.length, 10) + 1
        ) +
        Date.parse(new Date()) +
        password.substr(
            parseInt(Math.random() * password.length, 10) + 1,
            parseInt(Math.random() * password.length, 10) + 1
        );
    tokens.set(username, token);
    res.send({ "success": true, "token": token });
}

let checkMissingToken = (token, res) => {
    if (token === undefined) {
        res.send({ "success": false, "reason": "token field missing" });
        return true;
    }
    return false;
}

let checkInvalidToken = (username, res) => {
    if (username === undefined) {
        res.send({ "success": false, "reason": "Invalid token" });
        return true;
    }
    return false;
}

let checkInvalidOldPassword = (username, oldPassword, users, res) => {
    if (oldPassword !== users.get(username)) {
        res.send({ "success": false, "reason": "Unable to authenticate" });
        return true;
    }
    return false;
}

let changePassword = (username, newPassword, users, res) => {
    users.set(username, newPassword);
    res.send({ "success": true });
}

let checkMissingListItemPrice = (price, res) => {
    if (price === undefined) {
        res.send({ "success": false, "reason": "price field missing" });
        return true;
    }
    return false;
}

let checkMissingListItemDescription = (description, res) => {
    if (description === undefined) {
        res.send({ "success": false, "reason": "description field missing" });
        return true;
    }
    return false;
}

let createListing = (price, description, username, listing, res) => {
    let maxTrimNameLength = Math.min(3, description.split(" ").join("").length);
    let listingId = description.substr(0, maxTrimNameLength) + price + Date.parse(new Date());
    listing.set(listingId, { "price": price, "description": description, "itemId": listingId, "sellerUsername": username });
    res.send({ "success": true, "listingId": listingId });
}

let checkMissingListingId = (listingId, res) => {
    if (listingId === undefined) {
        res.send({ "success": false, "reason": "listingId field missing" });
        return true;
    }
    return false;
}

let checkInvalidListingId = (listingId, listing, res) => {
    if (!listing.has(listingId)) {
        res.send({ "success": false, "reason": "Invalid listing id" });
        return true;
    }
    return false;
}

let getListing = (listingId, listing, res) => {
    res.send({ "success": true, "listing": listing.get(listingId) });
}

let checkMissingItemId = (itemId, res) => {
    if (itemId === undefined) {
        res.send({ "success": false, "reason": "itemid field missing" });
        return true;
    }
    return false;
}

let modifyListing = (body, listing, res) => {
    if (body.price !== undefined) {
        listing.get(body.itemid).price = body.price;
    }
    if (body.description !== undefined) {
        listing.get(body.itemid).description = body.description;
    }
    res.send({ "success": true });
}

let checkAvailableListingItem = (listingId, listing, res) => {
    if (!listing.has(listingId)) {
        res.send({ "success": false, "reason": "Item not found" });
        return true;
    }
    return false;
}

let addToCart = (username, listingId, listing, res) => {
    if (!cart.has(username)) {
        cart.set(username, [listing.get(listingId)]);
    } else {
        cart.get(username).push(listing.get(listingId));
    }
    res.send({ "success": true });
}

let getCartItems = (username, res) => {
    res.send({ "success": true, "cart": cart.get(username) });
}

let checkItemNotAvailable = (listingId, listing, res) => {
    if (!listing.has(listingId)) {
        res.send({ "success": false, "reason": "Item in cart no longer available" });
        return true;
    }
    return false;
}

let checkEmptyCart = (username, res) => {
    if (!cart.has(username) || cart.get(username).length === 0) {
        res.send({ "success": false, "reason": "Empty cart" });
        return true;
    }
    return false;
}

let checkout = (username, res) => {
    let tempItemId = undefined;
    let tempShipStatus = new Map(JSON.parse(JSON.stringify(Array.from(shipStatus))));
    let tempListing = new Map(JSON.parse(JSON.stringify(Array.from(listing))));
    for (let i = 0; i < cart.get(username).length; i++) {
        tempItemId = cart.get(username)[i].itemId;
        if (checkItemNotAvailable(tempItemId, listing, res)) {
            return;
        }
        tempShipStatus.set(tempItemId, { "itemDetails": listing.get(tempItemId), "status": "not-shipped" });
        tempListing.delete(tempItemId);
    }
    listing = tempListing;
    shipStatus = tempShipStatus;
    // // previous purchaseHistory format Map {username => [{"price": xxx, "description": xxx, "itemId": xxx, "sellerUsername": xxx}]}
    // if (!purchaseHistory.has(username) || purchaseHistory.get(username).length === 0) {
    //     purchaseHistory.set(username, cart.get(username));
    // } else {
    //     purchaseHistory.get(username).push.apply(purchaseHistory.get(username), cart.get(username));
    // }

    // new purchaseHistory format Map {
    //     username => Map {
    //         itemid => {{"price": xxx, "description": xxx, "itemId": xxx, "sellerUsername": xxx}}
    //     }
    // }
    if (!purchaseHistory.has(username) || purchaseHistory.get(username).length === 0) {
        purchaseHistory.set(username, new Map());
        let tempItem = undefined;
        for (let i in cart.get(username)) {
            tempItem = cart.get(username)[i]
            purchaseHistory.get(username).set(tempItem.itemId, tempItem);
        }
    } else {
        let tempItem = undefined;
        for (let i in cart.get(username)) {
            tempItem = cart.get(username)[i]
            purchaseHistory.get(username).set(tempItem.itemId, tempItem);
        }
    }
    cart.set(username, []);
    res.send({ "success": true });
}

let getPurchaseHistory = (username, res) => {
    // // previous getHistory
    // res.send({ "success": true, "purchased": purchaseHistory.get(username) });

    // new getHistory
    res.send({ "success": true, "purchased": Array.from(purchaseHistory.get(username).values()) });
}

let checkMissingChatDestination = (destination, res) => {
    if (destination === undefined) {
        res.send({ "success": false, "reason": "destination field missing" });
        return true;
    }
    return false;
}

let checkMissingChatContents = (contents, res) => {
    if (contents === undefined) {
        res.send({ "success": false, "reason": "contents field missing" });
        return true;
    }
    return false;
}

let checkValidChatUser = (username, users, res) => {
    if (!users.has(username)) {
        res.send({ "success": false, "reason": "Destination user does not exist" });
        return true;
    }
    return false;
}

let chat = (from, destination, chatMessages, contents, res) => {
    if (!chatMessages.has(from)) {
        // chat history no "from" user
        let destinationsMap = new Map();
        destinationsMap.set(destination, {
            contentsHere: true,
            allContents: [{ "from": from, "contents": contents }]
        })
        chatMessages.set(from, destinationsMap);

        let fromsMap = new Map();
        fromsMap.set(from, {
            contentsHere: false
        });
        chatMessages.set(destination, fromsMap);

    } else {
        // find the "from" user in chat message history
        if (chatMessages.get(from).get(destination).contentsHere) {
            chatMessages.get(from).get(destination).allContents.push({ "from": from, "contents": contents });
        } else {
            chatMessages.get(destination).get(from).allContents.push({ "from": from, "contents": contents });
        }
    }
    res.send({ "success": true });
}

let checkValidDestinationUser = (username, users, res) => {
    if (!users.has(username)) {
        res.send({ "success": false, "reason": "Destination user not found" });
        return true;
    }
    return false;
}

let getChatMessages = (from, destination, chatMessages, res) => {
    if (chatMessages.get(from).get(destination).contentsHere) {
        res.send({ "success": true, "messages": chatMessages.get(from).get(destination).allContents });
    } else {
        res.send({ "success": true, "messages": chatMessages.get(destination).get(from).allContents })
    }
    return;
}

let checkItemNotSold = (listingId, listing, res) => {
    if (listing.has(listingId) || !shipStatus.has(listingId)) {
        res.send({ "success": false, "reason": "Item was not sold" });
        return true;
    }
    return false;
}

let checkItemHasShipped = (listingId, shipStatus, res) => {
    if (shipStatus.get(listingId).status === "shipped") {
        res.send({ "success": false, "reason": "Item has already shipped" });
        return true;
    }
    return false;
}

let checkShippingItemSeller = (listingId, username, res) => {
    if (shipStatus.get(listingId)["itemDetails"].sellerUsername !== username) {
        res.send({ "success": false, "reason": "User is not selling that item" });
        return true;
    }
    return false;
}

let shipItem = (listingId, res) => {
    shipStatus.get(listingId).status = "shipped";
    res.send({ "success": true });
}

let checkItemStatus = (listingId, shipStatus, res) => {
    if (listing.has(listingId) || !shipStatus.has(listingId)) {
        res.send({ "success": false, "reason": "Item not sold" });
        return;
    }
    res.send({ "success": true, "status": shipStatus.get(listingId).status });
}

let checkTransactionHasBeenReviewed = (itemId, username, reviews, res) => {
    let sellerUsername = purchaseHistory.get(username).get(itemId).sellerUsername;
    if (reviews.has(sellerUsername) && reviews.get(sellerUsername).has(itemId)) {
        res.send({ "success": false, "reason": "This transaction was already reviewed" });
        return true;
    }
    return false;
}

let checkUserNotPurchasedItem = (username, itemid, purchaseHistory, res) => {
    if (purchaseHistory.get(username).get(itemid) === undefined) {
        res.send({ "success": false, "reason": "User has not purchased this item" });
        return true;
    }
    return false;
}

let reviewSeller = (username, itemId, purchaseHistory, reviews, reviewContentBody, res) => {
    let sellerUsername = purchaseHistory.get(username).get(itemId).sellerUsername;
    let reviewContent = { "from": username, "numStars": reviewContentBody.numStars, "contents": reviewContentBody.contents };
    if (!reviews.has(sellerUsername)) {
        reviews.set(sellerUsername, new Map());
        reviews.get(sellerUsername).set(itemId, [reviewContent]);
    } else {
        if (!reviews.get(sellerUsername).has(itemId)) {
            reviews.get(sellerUsername).set(itemId, [reviewContent]);
        } else {
            reviews.get(sellerUsername).get(itemId).push(reviewContent);
        }
    }
    res.send({ "success": true });
}

let getReviews = (sellerUsername, res) => {
    let result = [];
    for (let [k, v] of reviews.get(sellerUsername).entries()) {
        result.push.apply(result, v);
    }
    res.send({ "success": true, "reviews": result });
}

let checkMissingSellerusername = (sellerUsername, res) => {
    if (sellerUsername === undefined) {
        res.send({ "success": false, "reason": "sellerUsername field missing" });
        return true;
    }
    return false;
}

let getCurrentSelling = (sellerUsername, listing, res) => {
    let currentSelling = [];
    let allSelling = Array.from(listing.values());
    allSelling.forEach((v) => {
        if (v.sellerUsername === sellerUsername) {
            currentSelling.push(v);
        }
    });
    res.send({ "success": true, "selling": currentSelling });
}

// method: POST, path: /signup
app.post("/signup", (req, res) => {
    let parsedRequestBody = JSON.parse(req.body);
    let requestUsername = parsedRequestBody.username;
    let requestPassword = parsedRequestBody.password;
    if (checkMissingUsername(requestUsername, res)) { return; }
    if (checkMissingPassword(requestPassword, res)) { return; }
    if (checkExistedRegisteredUser(requestUsername, users, res)) { return; }
    signup(requestUsername, requestPassword, res);

})
// method: POST, path: /login
app.post("/login", (req, res) => {
    let parsedRequestBody = JSON.parse(req.body);
    let requestUsername = parsedRequestBody.username;
    let requestPassword = parsedRequestBody.password;
    if (checkMissingUsername(requestUsername, res)) { return; }
    if (checkMissingPassword(requestPassword, res)) { return; }
    if (checkLoginNotExistedUser(requestUsername, users, res)) { return; }
    if (checkLoginInvalidPassword(requestUsername, requestPassword, users, res)) { return; }
    login(requestUsername, requestPassword, tokens, res);
})
// method: POST, path: /change-password
app.post("/change-password", (req, res) => {
    let requestToken = req.headers.token;
    if (checkMissingToken(requestToken, res)) { return; }
    let requestUsername = getUsernameByToken(tokens, requestToken);
    if (checkInvalidToken(requestUsername, res)) { return; }
    let parsedRequestBody = JSON.parse(req.body);
    let parsedOldPassword = parsedRequestBody.oldPassword;
    if (checkInvalidOldPassword(requestUsername, parsedOldPassword, users, res)) { return; }
    let parsedNewPassword = parsedRequestBody.newPassword;
    changePassword(requestUsername, parsedNewPassword, users, res);
})
// method: POST, path: /create-listing
app.post("/create-listing", (req, res) => {
    let requestToken = req.headers.token;
    if (checkMissingToken(requestToken, res)) { return; }
    let requestUsername = getUsernameByToken(tokens, requestToken);
    if (checkInvalidToken(requestUsername, res)) { return; }
    let parsedRequestBody = JSON.parse(req.body);
    let parsedRequestPrice = parsedRequestBody.price;
    let parsedRequestDescription = parsedRequestBody.description;
    if (checkMissingListItemPrice(parsedRequestPrice, res)) { return; }
    if (checkMissingListItemDescription(parsedRequestDescription, res)) { return; }
    createListing(parsedRequestPrice, parsedRequestDescription, requestUsername, listing, res);
})
// method: GET, path: /listing
app.get("/listing", (req, res) => {
    let requestListingId = req.query.listingId;
    if (checkMissingListingId(requestListingId, res)) { return; }
    if (checkInvalidListingId(requestListingId, listing, res)) { return; }
    getListing(requestListingId, listing, res);
})
// method: POST, path: /modify-listing
app.post("/modify-listing", (req, res) => {
    let requestToken = req.headers.token;
    if (checkMissingToken(requestToken, res)) { return; }
    let requestUsername = getUsernameByToken(tokens, requestToken);
    if (checkInvalidToken(requestUsername, res)) { return; }
    let parsedRequestBody = JSON.parse(req.body);
    if (checkMissingItemId(parsedRequestBody.itemid, res)) { return; }
    modifyListing(parsedRequestBody, listing, res);
})
// method: POST, path: /add-to-cart
app.post("/add-to-cart", (req, res) => {
    let requestToken = req.headers.token;
    if (checkMissingToken(requestToken, res)) { return; }
    let requestUsername = getUsernameByToken(tokens, requestToken);
    if (checkInvalidToken(requestUsername, res)) { return; }
    let parsedRequestItemId = JSON.parse(req.body).itemid;
    if (checkMissingItemId(parsedRequestItemId, res)) { return; }
    if (checkAvailableListingItem(parsedRequestItemId, listing, res)) { return; }
    addToCart(requestUsername, parsedRequestItemId, listing, res);
})
// method: GET, path: /cart
app.get("/cart", (req, res) => {
    let requestToken = req.headers.token;
    if (checkMissingToken(requestToken, res)) { return; }
    let requestUsername = getUsernameByToken(tokens, requestToken);
    if (checkInvalidToken(requestUsername, res)) { return; }
    getCartItems(requestUsername, res);
})
// method: POST, path: /checkout
app.post("/checkout", (req, res) => {
    let requestToken = req.headers.token;
    if (checkMissingToken(requestToken, res)) { return; }
    let requestUsername = getUsernameByToken(tokens, requestToken);
    if (checkInvalidToken(requestUsername, res)) { return; }
    if (checkEmptyCart(requestUsername, res)) { return; }
    checkout(requestUsername, res);
})
// method: GET, path: /purchase-history
app.get("/purchase-history", (req, res) => {
    let requestToken = req.headers.token;
    if (checkMissingToken(requestToken, res)) { return; }
    let requestUsername = getUsernameByToken(tokens, requestToken);
    if (checkInvalidToken(requestUsername, res)) { return; }
    getPurchaseHistory(requestUsername, res);
})
// method: POST, path: /chat
app.post("/chat", (req, res) => {
    let requestToken = req.headers.token;
    if (checkMissingToken(requestToken, res)) { return; }
    let requestUsername = getUsernameByToken(tokens, requestToken);
    if (checkInvalidToken(requestUsername, res)) { return; }
    let parsedRequestBody = JSON.parse(req.body);
    if (checkMissingChatDestination(parsedRequestBody.destination, res)) { return; }
    if (checkMissingChatContents(parsedRequestBody.contents, res)) { return; }
    if (checkValidChatUser(parsedRequestBody.destination, users, res)) { return; }
    chat(requestUsername, parsedRequestBody.destination, chatMessages, parsedRequestBody.contents, res);
})
// method: POST, path: /chat-messages
app.post("/chat-messages", (req, res) => {
    let requestToken = req.headers.token;
    if (checkMissingToken(requestToken, res)) { return; }
    let requestUsername = getUsernameByToken(tokens, requestToken);
    if (checkInvalidToken(requestUsername, res)) { return; }
    let parsedRequestBody = JSON.parse(req.body);
    if (checkMissingChatDestination(parsedRequestBody.destination, res)) { return; }
    if (checkValidDestinationUser(parsedRequestBody.destination, users, res)) { return; }
    getChatMessages(requestUsername, parsedRequestBody.destination, chatMessages, res);
})
// method: POST, path: /ship
app.post("/ship", (req, res) => {
    let requestToken = req.headers.token;
    if (checkMissingToken(requestToken, res)) { return; }
    let requestUsername = getUsernameByToken(tokens, requestToken);
    if (checkInvalidToken(requestUsername, res)) { return; }
    let parsedRequestItemId = JSON.parse(req.body).itemid;
    if (checkItemNotSold(parsedRequestItemId, listing, res)) { return; }
    if (checkItemHasShipped(parsedRequestItemId, shipStatus, res)) { return; }
    if (checkShippingItemSeller(parsedRequestItemId, requestUsername, res)) { return; }
    shipItem(parsedRequestItemId, res);
})
// method: GET, path: /status
app.get("/status", (req, res) => {
    let requestListingId = req.query.itemid;
    checkItemStatus(requestListingId, shipStatus, res);
})
// method: POST, path: /review-seller
app.post("/review-seller", (req, res) => {
    let requestToken = req.headers.token;
    if (checkMissingToken(requestToken, res)) { return; }
    let requestUsername = getUsernameByToken(tokens, requestToken);
    if (checkInvalidToken(requestUsername, res)) { return; }
    let parsedRequestBody = JSON.parse(req.body);
    // let seller = getSellernameByItemid(parsedRequestBody.itemid, listing);
    if (checkUserNotPurchasedItem(requestUsername, parsedRequestBody.itemid, purchaseHistory, res)) { return; }
    if (checkTransactionHasBeenReviewed(parsedRequestBody.itemid, requestUsername, reviews, res)) { return; }
    reviewSeller(requestUsername, parsedRequestBody.itemid, purchaseHistory, reviews, parsedRequestBody, res);
})
// method: GET, path: /reviews
app.get("/reviews", (req, res) => {
    let requestSellerName = req.query.sellerUsername;
    getReviews(requestSellerName, res);
})
// method: GET, path: /selling
app.get("/selling", (req, res) => {
    let requestSellerName = req.query.sellerUsername;
    if (checkMissingSellerusername(requestSellerName, res)) { return; }
    if (checkLoginNotExistedUser(requestSellerName, users, res)) { return; }
    getCurrentSelling(requestSellerName, listing, res);
})
// const listener = app.listen(process.env.PORT, () => {
//     console.log("Your app is listening on port " + listener.address().port);
// });
const listener = app.listen(process.env.PORT || 3000);