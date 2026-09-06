const FIREBASE_URL = "https://fighter-club-f5623-default-rtdb.firebaseio.com"; 

let accountsData = [];
let inventoryData = [];
let feedbackData = [];
let galleryData = [];
let directoryData = [];
let activeBirthdayWish = "আজ আমাদের ক্লাবের কোনো মেম্বারের জন্মদিন নেই। 🎉";
let isAdmin = false;
let currentFilter = 'All';

function initDashboard() {
    loadAccounts();
    loadInventory();
    loadFeedback();
    loadGallery();
    loadDirectory();
    loadWeather();
    requestNotificationPermission(); 
    listenToPushNotifications();    
    
    const dateElem = document.getElementById('date');
    if (dateElem) dateElem.valueAsDate = new Date();
    
    fetch(FIREBASE_URL + "/notice.json")
        .then(res => res.json())
        .then(text => { if(text && document.getElementById("noticeText")) document.getElementById("noticeText").innerText = text; });
    
    fetch(FIREBASE_URL + "/birthday.json")
        .then(res => res.json())
        .then(wish => { if(wish) activeBirthdayWish = wish; });
}

function requestNotificationPermission() {
    if ("Notification" in window) {
        if (Notification.permission === "default") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    console.log("Notification permission granted!");
                }
            });
        }
    }
}

function listenToPushNotifications() {
    setInterval(() => {
        fetch(FIREBASE_URL + "/push_notification.json")
        .then(res => res.json())
        .then(data => {
            if (data && data.text) {
                let lastNotifId = localStorage.getItem("last_fighter_notif_id");
                if (lastNotifId !== data.id) {
                    localStorage.setItem("last_fighter_notif_id", data.id);
                    triggerSystemNotification(data.text);
                }
            }
        }).catch(err => console.log("Notification check failed", err));
    }, 5000);
}

function triggerSystemNotification(message) {
    if ("Notification" in window && Notification.permission === "granted") {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification("🏏 FIGHTER Cricket Club", {
                body: message,
                icon: "fighter-cricket-logo.png",
                badge: "fighter-cricket-logo.png",
                vibrate: [200, 100, 200],
                tag: "fighter-notice"
            });
        });
    } else {
        showFighterNotification("📢 নতুন ঘোষণা: " + message, "info");
    }
}

function sendPushNotification() {
    let msgText = document.getElementById("pushMessage")?.value;
    if (!msgText) return showFighterNotification("নোটিফিকেশনের টেক্সট লিখুন!", "warning");
    
    let notificationPayload = {
        id: new Date().getTime().toString(), 
        text: msgText
    };

    fetch(FIREBASE_URL + "/push_notification.json", { 
        method: "PUT", 
        body: JSON.stringify(notificationPayload) 
    }).then(() => {
        if (document.getElementById("pushMessage")) document.getElementById("pushMessage").value = "";
        showFighterNotification("🚀 সব মেম্বারের ফোনে নোটিফিকেশন চলে গেছে!", "success");
    }).catch(() => {
        showFighterNotification("❌ নোটিফিকেশন পাঠাতে ব্যর্থ হয়েছে।", "error");
    });
}

function showFighterNotification(msg, type = "success") {
    let toast = document.getElementById("fighterToast");
    if (!toast) {
        alert(msg);
        return;
    }
    toast.innerText = msg;
    toast.className = `toast-notification show ${type}`;
    setTimeout(() => { toast.classList.remove("show"); }, 3500);
}

function toggleDark() {
    document.body.classList.toggle("dark");
    showFighterNotification("থিম পরিবর্তন করা হয়েছে!", "success");
}

function handleAuth() {
    if(!isAdmin) {
        let pass = prompt("অ্যাডমিন পাসওয়ার্ড দিন:");
        if(pass === "fighter123") { 
            isAdmin = true;
            if(document.getElementById("authBtn")) {
                document.getElementById("authBtn").innerText = "🔓 Logout";
                document.getElementById("authBtn").className = "btn-danger";
            }
            if(document.getElementById("adminStatus")) {
                document.getElementById("adminStatus").innerText = "Admin Mode: আপনি এখন যেকোনো ডাটা পরিবর্তন করতে পারবেন।";
                document.getElementById("adminStatus").classList.add("admin-active");
            }
            ["adminForm", "directoryForm", "inventoryForm", "galleryForm", "noticeForm", "newsForm"].forEach(id => {
                let el = document.getElementById(id);
                if(el) el.style.display = "block";
            });
            showFighterNotification("অ্যাডমিন লগইন সফল হয়েছে!", "success");
            
            // সব লিস্ট পুনরায় রেন্ডার
            render(); 
            renderDirectory(); 
            renderGallery(); 
            renderInventory(); 
            loadFeedback();
            if (typeof showMembershipAdmin === "function") showMembershipAdmin();
        } else {
            showFighterNotification("ভুল পাসওয়ার্ড!", "error");
        }
    } else {
        isAdmin = false;
        if(document.getElementById("authBtn")) {
            document.getElementById("authBtn").innerText = "🔐 Admin Login";
            document.getElementById("authBtn").className = "btn-success";
        }
        if(document.getElementById("adminStatus")) {
            document.getElementById("adminStatus").innerText = "View Mode: আপনি এখন হিসাব শুধু দেখতে পারবেন।";
            document.getElementById("adminStatus").classList.remove("admin-active");
        }
        ["adminForm", "directoryForm", "inventoryForm", "galleryForm", "noticeForm", "newsForm"].forEach(id => {
            let el = document.getElementById(id);
            if(el) el.style.display = "none";
        });
        showFighterNotification("লগআউট সফল হয়েছে।", "warning");
        
        // সব লিস্ট পুনরায় রেন্ডার
        render(); 
        renderDirectory(); 
        renderGallery(); 
        renderInventory(); 
        loadFeedback();
    }
}

function loadAccounts() {
    fetch(FIREBASE_URL + "/accounts.json").then(res => res.json()).then(serverData => {
        accountsData = [];
        if(serverData) { Object.keys(serverData).forEach(key => { accountsData.push({ id: key, ...serverData[key] }); }); }
        render();
    });
}

function render() {
    let list = document.getElementById("list");
    if(!list) return;
    list.innerHTML = "";
    let search = document.getElementById("search") ? document.getElementById("search").value.toLowerCase() : "";
    
    let totalIncome = 0;
    let totalExpense = 0;
    
    accountsData.forEach(acc => {
        if(acc.type === "income") totalIncome += Number(acc.paid || 0);
        if(acc.type === "expense") totalExpense += Number(acc.price || 0);
        
        let memberName = acc.member || "";
        let itemName = acc.item || "";
        
        if(memberName.toLowerCase().includes(search) || itemName.toLowerCase().includes(search)) {
            let due = Number(acc.price || 0) - Number(acc.paid || 0);
            list.innerHTML += `
                <tr>
                    <td style="color:#3b82f6; font-weight:600; cursor:pointer;" onclick="openMemberModal('${memberName}')">👤 ${memberName}</td>
                    <td>${itemName}</td>
                    <td><span style="color:${acc.type==='income'?'#10b981':'#ef4444'}; font-weight:bold;">${acc.type==='income'?'জমা (In)':'খরচ (Out)'}</span></td>
                    <td>${acc.date || ''}</td>
                    <td style="font-weight:600;">${acc.price} ৳</td>
                    <td style="color:#10b981; font-weight:600;">${acc.paid} ৳</td>
                    <td style="color:${due>0?'#ef4444':'#10b981'}; font-weight:bold;">${due} ৳</td>
                    ${isAdmin ? `<td><button class="btn-danger" style="padding:6px 12px; font-size:12px; border-radius:8px;" onclick="delAccount('${acc.id}')">Delete</button></td>` : ''}
                </tr>`;
        }
    });
    
    if(document.getElementById("totalMoney")) document.getElementById("totalMoney").innerText = totalIncome + " ৳";
    if(document.getElementById("totalExpense")) document.getElementById("totalExpense").innerText = totalExpense + " ৳";
    if(document.getElementById("liveVault")) document.getElementById("liveVault").innerText = (totalIncome - totalExpense) + " ৳";
}

function addAccount() {
    let member = document.getElementById("member")?.value;
    let item = document.getElementById("item")?.value;
    let type = document.getElementById("type")?.value;
    let price = Number(document.getElementById("price")?.value);
    let paid = Number(document.getElementById("paid")?.value);
    let date = document.getElementById("date")?.value;
    
    if(!member || !item || !price || !date) return showFighterNotification("সব তথ্য দিন!", "warning");
    
    let newData = { member, item, type, price, paid, date };
    fetch(FIREBASE_URL + "/accounts.json", { method: "POST", body: JSON.stringify(newData) }).then(() => {
        loadAccounts();
        document.getElementById("member").value = ""; document.getElementById("item").value = "";
        document.getElementById("price").value = ""; document.getElementById("paid").value = "";
        showFighterNotification("হিসাব লাইভ ডেটাবেজে যুক্ত হয়েছে!", "success");
    });
}

function delAccount(id) {
    if(confirm("হিসাবটি ডিলিট করতে চান?")) {
        fetch(`${FIREBASE_URL}/accounts/${id}.json`, { method: "DELETE" }).then(() => { 
            loadAccounts();
            showFighterNotification("হিসাবটি ডিলিট করা হয়েছে।", "warning");
        });
    }
}

function loadDirectory() {
    fetch(FIREBASE_URL + "/directory.json")
    .then(res => res.json())
    .then(serverData => {
        directoryData = [];
        if(serverData) { 
            Object.keys(serverData).forEach(key => { 
                directoryData.push({ id: key, ...serverData[key] }); 
            }); 
        }
        
        let totalBox = document.getElementById("totalMembers");
        if(totalBox) {
            totalBox.innerText = directoryData.length + " জন";
        }
        
        renderDirectory();
        setTimeout(checkTodayBirthdaysSilent, 2000); 
    })
    .catch(err => console.error("Error loading directory:", err));
}

function checkTodayBirthdaysSilent() {
    let today = new Date();
    let todayDay = today.getDate();
    let todayMonth = today.getMonth() + 1;
    let birthdayBoys = [];

    directoryData.forEach(member => {
        if (member.dob) {
            let memberBirthDate = new Date(member.dob);
            if (todayDay === memberBirthDate.getDate() && todayMonth === (memberBirthDate.getMonth() + 1)) {
                birthdayBoys.push(member.name);
            }
        }
    });

    if (birthdayBoys.length > 0) {
        let noticeText = document.getElementById("noticeText");
        if(noticeText) {
            noticeText.innerText = `🎂 জন্মদিনের শুভেচ্ছা! আজ ফাইটার ক্লাবের সদস্য ${birthdayBoys.join(", ")} এর জন্মদিন! 🎉`;
        }
    }
}

function addDirectory() {
    let name = document.getElementById("dirName")?.value;
    let phone = document.getElementById("dirPhone")?.value;
    let blood = document.getElementById("dirBlood")?.value;
    let dob = document.getElementById("dirDOB")?.value;
    let fileInput = document.getElementById("dirFile")?.files[0];
    
    if(!name || !phone || !dob) return showFighterNotification("নাম, ফোন ও জন্মতারিখ দিন!", "warning");

    if (fileInput) {
        let reader = new FileReader();
        reader.onload = function(e) {
            let base64Img = e.target.result;
            saveDirectoryToFirebase(name, phone, base64Img, blood, dob);
        };
        reader.readAsDataURL(fileInput);
    } else {
        saveDirectoryToFirebase(name, phone, "https://cdn-icons-png.flaticon.com/512/149/149071.png", blood, dob);
    }
}

function saveDirectoryToFirebase(name, phone, imgData, blood, dob) {
    fetch(FIREBASE_URL + "/directory.json", { 
        method: "POST", 
        body: JSON.stringify({ name, phone, img: imgData, blood, dob }) 
    })
    .then(res => res.json())
    .then(() => {
        if(document.getElementById("dirName")) document.getElementById("dirName").value = ""; 
        if(document.getElementById("dirPhone")) document.getElementById("dirPhone").value = "";
        if(document.getElementById("dirDOB")) document.getElementById("dirDOB").value = "";
        if(document.getElementById("dirFile")) document.getElementById("dirFile").value = "";
        
        showFighterNotification("মেম্বার প্রোফাইল তৈরি হয়েছে!", "success");
        loadDirectory(); 
    })
    .catch(err => {
        showFighterNotification("ডাটা সেভ করতে সমস্যা হয়েছে!", "error");
    });
}

function delDirectory(id) {
    if (!isAdmin) {
        showFighterNotification("শুধু Admin মেম্বার Delete করতে পারবেন।", "warning");
        return;
    }

    if (!confirm("আপনি কি এই মেম্বারটি Delete করতে চান?")) return;

    fetch(`${FIREBASE_URL}/directory/${id}.json`, { method: "DELETE" })
    .then(response => {
        if (!response.ok) throw new Error("Delete failed");
        showFighterNotification("মেম্বার সফলভাবে Delete করা হয়েছে।", "success");
        loadDirectory();
    })
    .catch(error => {
        console.error(error);
        showFighterNotification("মেম্বার Delete করা যায়নি।", "error");
    });
}

function renderDirectory() {
    const container = document.getElementById("directoryCardContainer");
    if (!container) return;
    
    container.innerHTML = "";

    if (!directoryData || directoryData.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#94a3b8; width:100%; grid-column: 1 / -1;">কোনো মেম্বার ডাটা লোড হয়নি বা খালি আছে।</p>`;
        return;
    }

    directoryData.forEach(d => {
        let deleteBtn = isAdmin 
            ? `<button class="btn-danger" style="display: flex !important; padding: 8px 12px; font-size: 12px; margin-top: 15px; width: 100%; justify-content: center; align-items: center; border-radius: 8px; cursor: pointer; background-color: #ef4444; color: white; border: none; font-weight: bold;" onclick="delDirectory('${d.id}')">🗑️ Delete Profile</button>` 
            : '';

        container.innerHTML += `
            <div class="member-card">
                <img src="${d.img || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" class="avatar" onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'">
                <h4>${d.name || 'Unknown Member'}</h4>
                <a class="phone" href="javascript:void(0)" onclick="showPhone('${d.phone || ''}')">📞 ফোন নম্বর দেখুন</a>
                <span class="blood-badge">🩸 Group: ${d.blood || 'N/A'}</span>
                ${deleteBtn}
            </div>
        `;
    });
}
function loadInventory() {
    fetch(FIREBASE_URL + "/inventory.json").then(res => res.json()).then(serverData => {
        inventoryData = []; 
        if(serverData) { Object.keys(serverData).forEach(key => { inventoryData.push({ id: key, ...serverData[key] }); }); }
        renderInventory();
    });
}

function addInventory() {
    let item = document.getElementById("invItem")?.value; 
    let qty = document.getElementById("invQty")?.value; 
    let status = document.getElementById("invStatus")?.value;
    if(!item || !qty) return showFighterNotification("সব তথ্য দিন!", "warning");
    fetch(FIREBASE_URL + "/inventory.json", { method: "POST", body: JSON.stringify({item, qty, status}) }).then(() => { 
        loadInventory();
        document.getElementById("invItem").value = ""; document.getElementById("invQty").value = "";
        showFighterNotification("ইনভেন্টরি আপডেট হয়েছে!", "success");
    });
}

function delInventory(id) {
    if(confirm("ইনভেন্টরি থেকে ডিলিট করতে চান?")) {
        fetch(`${FIREBASE_URL}/inventory/${id}.json`, { method: "DELETE" }).then(() => { 
            loadInventory(); 
            showFighterNotification("আইটেম ডিলিট করা হয়েছে।", "warning");
        });
    }
}

function renderInventory(){
    let invList = document.getElementById("inventoryList"); 
    if(!invList) return;
    invList.innerHTML = "";
    inventoryData.forEach((d) => {
        invList.innerHTML += `
        <tr>
            <td><strong>🏏 ${d.item}</strong></td>
            <td style="font-weight:600;">${d.qty} টি</td>
            <td><span style="background:${d.status==='নষ্ট'?'rgba(239,68,68,0.15)':'rgba(16,185,129,0.15)'}; color:${d.status==='নষ্ট'?'#ef4444':'#10b981'}; padding:4px 12px; border-radius:50px; font-size:12px; font-weight:bold;">${d.status}</span></td>
            ${isAdmin ? `<td><button class="btn-danger" style="padding:6px 12px; font-size:12px; border-radius:8px;" onclick="delInventory('${d.id}')">Delete</button></td>` : ''}
        </tr>`;
    });
}

// Load Gallery Data from Firebase
// ১. ফায়ারবেজ থেকে গ্যালারি ডাটা লোড
function loadGallery() {
    fetch(FIREBASE_URL + "/gallery.json")
    .then(res => res.json())
    .then(serverData => {
        galleryData = [];
        if(serverData) {
            Object.keys(serverData).forEach(key => {
                galleryData.push({ id: key, ...serverData[key] });
            });
        }
        renderGallery();
    })
    .catch(err => console.error("Gallery load error:", err));
}

function uploadPhoto() {
    let fileInput = document.getElementById("galFile")?.files[0];
    let caption = document.getElementById("galCaption")?.value.trim();
    let album = document.getElementById("galAlbum")?.value || "Match";
    
    if(!fileInput || !caption) {
        return showFighterNotification("ছবি এবং ক্যাপশন দুটিই প্রদান করুন!", "warning");
    }

    let reader = new FileReader();
    reader.onload = function(e) {
        let newPhoto = { url: e.target.result, title: caption, album: album };
        fetch(FIREBASE_URL + "/gallery.json", {
            method: "POST",
            body: JSON.stringify(newPhoto)
        })
        .then(() => {
            loadGallery();
            document.getElementById("galFile").value = "";
            document.getElementById("galCaption").value = "";
            showFighterNotification("ছবি আপলোড হয়েছে!", "success");
        });
    };
    reader.readAsDataURL(fileInput);
}

function filterGallery(albumName) {
    currentFilter = albumName;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.trim().toLowerCase() === albumName.toLowerCase());
    });
    renderGallery();
}

function renderGallery() {
    let container = document.getElementById("galleryGrid");
    if(!container) return;
    container.innerHTML = "";

    let filteredData = galleryData.filter(item => currentFilter === 'All' || item.album === currentFilter);

    if(filteredData.length === 0) {
        container.innerHTML = `<p style="color:#94a3b8; text-align:center; grid-column:1/-1;">কোনো ছবি পাওয়া যায়নি।</p>`;
        return;
    }

    filteredData.forEach(item => {
        let card = document.createElement("div");
        card.className = "gallery-card";
        card.innerHTML = `
            <img src="${item.url}" alt="${item.title}" onclick="openLightbox('${item.url}', '${item.title}')" style="width:100%; height:180px; object-fit:cover; border-radius:8px; cursor:pointer;">
            <div style="padding:8px 0;">
                <h4 style="margin:0; font-size:14px; color:#fff;">${item.title}</h4>
                <span style="font-size:11px; color:#94a3b8;">📌 ${item.album}</span>
                ${isAdmin ? `<button onclick="deleteGallery('${item.id}')" style="background:#ef4444; color:#fff; border:none; padding:4px 8px; border-radius:4px; margin-top:5px; cursor:pointer;">🗑 Delete</button>` : ''}
            </div>`;
        container.appendChild(card);
    });
}

// ২. ছবি আপলোড ফাংশন
function uploadPhoto() {
    let fileInput = document.getElementById("galFile")?.files[0];
    let caption = document.getElementById("galCaption")?.value.trim();
    let album = document.getElementById("galAlbum")?.value || "Match";
    
    if (!fileInput || !caption) {
        return showFighterNotification("ছবি এবং ক্যাপশন দুটিই প্রদান করুন!", "warning");
    }

    showFighterNotification("ছবি প্রসেসিং হচ্ছে, অপেক্ষা করুন...", "info");

    let reader = new FileReader();
    reader.readAsDataURL(fileInput);
    reader.onload = function (event) {
        let img = new Image();
        img.src = event.target.result;
        
        img.onload = function () {
            let canvas = document.createElement("canvas");
            let ctx = canvas.getContext("2d");
            
            let maxWidth = 700;
            let scale = maxWidth / img.width;
            let width = scale < 1 ? maxWidth : img.width;
            let height = scale < 1 ? img.height * scale : img.height;

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            let compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);

            let newPhoto = { 
                url: compressedBase64, 
                title: caption, 
                album: album,
                date: new Date().toISOString()
            };

            let cleanUrl = FIREBASE_URL.replace(/\/+$/, "");

            fetch(`${cleanUrl}/gallery.json`, { 
                method: "POST", 
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newPhoto) 
            })
            .then(res => {
                if(!res.ok) throw new Error("Database Write Failed");
                return res.json();
            })
            .then(() => {
                // ফিল্টার All-এ নিয়ে আসা যাতে সব ছবি দেখা যায়
                currentFilter = "All"; 
                loadGallery(); // ফায়ারবেজ থেকে নতুন ডাটা পুনরায় লোড
                
                if(document.getElementById("galFile")) document.getElementById("galFile").value = ""; 
                if(document.getElementById("galCaption")) document.getElementById("galCaption").value = "";
                showFighterNotification("ছবি সফলভাবে গ্যালারিতে আপলোড হয়েছে! 📸", "success");
            })
            .catch(err => {
                console.error("Upload error:", err);
                showFighterNotification("আপলোড সফল হয়নি!", "error");
            });
        };
    };
}

// ৩. ফিল্টারিং ফাংশন
function filterGallery(albumName) {
    currentFilter = albumName;
    renderGallery();
}

// ৪. গ্যালারি রেন্ডার ফাংশন
function renderGallery() {
    let container = document.getElementById("galleryGrid"); 
    if(!container) return; 
    container.innerHTML = "";
    
    // global 'currentFilter' চেক (ডিফল্ট 'All')
    let activeFilter = typeof currentFilter !== 'undefined' ? currentFilter : 'All';
    
    let filteredData = galleryData.filter(item => {
        if(activeFilter === 'All') return true;
        return item.album && item.album.toLowerCase() === activeFilter.toLowerCase();
    });
    
    if(filteredData.length === 0) {
        container.innerHTML = `<p style="color:#94a3b8; text-align:center; grid-column:1/-1; padding:20px;">কোনো ছবি পাওয়া যায়নি।</p>`;
        return;
    }
    
    filteredData.forEach(item => {
        let card = document.createElement("div");
        card.className = "gallery-card";
        card.style.cssText = "position: relative; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden; padding: 8px;";
        
        let deleteBtn = isAdmin 
            ? `<button onclick="deleteGallery('${item.id}')" style="position: absolute; top: 12px; right: 12px; background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; z-index: 10;">🗑 ডিলিট</button>` 
            : '';

        card.innerHTML = `
            ${deleteBtn}
            <img src="${item.url}" alt="${item.title || 'Gallery'}" onclick="openLightbox('${item.url}', '${item.title || ''}')" style="width:100%; height:180px; object-fit:cover; border-radius:8px; cursor:pointer;">
            <div class="gallery-info" style="padding: 8px 4px 4px 4px;">
                <h4 style="margin:0; font-size:14px; font-weight:600; color:#fff;">${item.title || 'গ্যালারি ছবি'}</h4>
                <span style="font-size:11px; color:#94a3b8;">📌 ${item.album || 'Match'}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

// Upload Photo (Admin Only)
function uploadPhoto() {
    let fileInput = document.getElementById("galFile")?.files[0];
    let caption = document.getElementById("galCaption")?.value.trim();
    let album = document.getElementById("galAlbum")?.value || "Match";
    
    if(!fileInput || !caption) {
        return showFighterNotification("ছবি এবং ক্যাপশন দুটিই প্রদান করুন!", "warning");
    }
    
    let reader = new FileReader();
    reader.onload = function(e) {
        let base64Img = e.target.result;
        let newPhoto = { url: base64Img, title: caption, album: album };
        
        fetch(FIREBASE_URL + "/gallery.json", { 
            method: "POST", 
            body: JSON.stringify(newPhoto) 
        })
        .then(() => {
            loadGallery();
            if(document.getElementById("galFile")) document.getElementById("galFile").value = ""; 
            if(document.getElementById("galCaption")) document.getElementById("galCaption").value = "";
            showFighterNotification("ছবি সফলভাবে গ্যালারিতে যোগ হয়েছে!", "success");
        })
        .catch(() => showFighterNotification("ছবি আপলোড করতে ব্যর্থ হয়েছে!", "error"));
    };
    reader.readAsDataURL(fileInput);
}

// Delete Photo (Admin Only)
function deleteGallery(id) {
    if(!isAdmin) return showFighterNotification("শুধু অ্যাডমিন ডিলিট করতে পারবেন!", "warning");
    
    if(confirm("আপনি কি নিশ্চিত এই ছবিটি মুছে ফেলতে চান?")) {
        fetch(`${FIREBASE_URL}/gallery/${id}.json`, { method: "DELETE" })
        .then(() => { 
            loadGallery(); 
            showFighterNotification("ছবিটি মুছে ফেলা হয়েছে।", "warning");
        })
        .catch(() => showFighterNotification("ছবি ডিলিট করতে সমস্যা হয়েছে!", "error"));
    }
}

// Filter Gallery by Category
function filterGallery(albumName) {
    currentFilter = albumName;
    
    // Toggle active status on buttons
    let btns = document.querySelectorAll('.filter-btn');
    btns.forEach(btn => {
        if(btn.innerText.trim().toLowerCase() === albumName.toLowerCase()) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    renderGallery();
}

// Render Gallery Images
function renderGallery() {
    let container = document.getElementById("galleryGrid"); 
    if(!container) return; 
    container.innerHTML = "";
    
    let filteredData = galleryData.filter(item => currentFilter === 'All' || item.album === currentFilter);
    
    if(filteredData.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); text-align:center; grid-column:1/-1;">কোনো ছবি পাওয়া যায়নি।</p>`;
        return;
    }
    
    filteredData.forEach(item => {
        let card = document.createElement("div");
        card.className = "gallery-card";
        card.style.cssText = "position: relative; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden; padding: 8px;";
        
        let deleteBtn = isAdmin 
            ? `<button onclick="deleteGallery('${item.id}')" style="position: absolute; top: 12px; right: 12px; background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; z-index: 10;">🗑 ডিলিট</button>` 
            : '';

        card.innerHTML = `
            ${deleteBtn}
            <img src="${item.url || 'https://via.placeholder.com/200'}" alt="${item.title || 'Gallery'}" onclick="openLightbox('${item.url}', '${item.title || ''}')" style="width:100%; height:180px; object-fit:cover; border-radius:8px; cursor:pointer;">
            <div class="gallery-info" style="padding: 8px 4px 4px 4px;">
                <h4 style="margin:0; font-size:14px; font-weight:600; color:var(--text-color, #fff);">${item.title || 'গ্যালারি ছবি'}</h4>
                <span style="font-size:11px; color:#94a3b8;">📌 ${item.album || 'Match'}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

// Lightbox Open & Close
function openLightbox(url, caption) {
    if(document.getElementById("lightboxImg")) document.getElementById("lightboxImg").src = url;
    if(document.getElementById("lightboxCaption")) document.getElementById("lightboxCaption").innerText = caption;
    if(document.getElementById("lightbox")) document.getElementById("lightbox").style.display = "flex";
}

function closeLightbox() { 
    if(document.getElementById("lightbox")) document.getElementById("lightbox").style.display = "none"; 
}

// Upload Photo Function
function uploadPhoto() {
    let fileInput = document.getElementById("galFile")?.files[0];
    let caption = document.getElementById("galCaption")?.value.trim();
    let album = document.getElementById("galAlbum")?.value || "Match";
    
    if (!fileInput || !caption) {
        return showFighterNotification("ছবি এবং ক্যাপশন দুটিই প্রদান করুন!", "warning");
    }

    showFighterNotification("ছবি কমপ্রেস এবং আপলোড হচ্ছে, অপেক্ষা করুন...", "info");

    let reader = new FileReader();
    reader.readAsDataURL(fileInput);
    reader.onload = function (event) {
        let img = new Image();
        img.src = event.target.result;
        
        img.onload = function () {
            // ছবির সাইজ কমপ্রেস করার ক্যানভাস প্রসেস
            let canvas = document.createElement("canvas");
            let ctx = canvas.getContext("2d");
            
            let maxWidth = 700; // ইমেজের সর্বোচ্চ প্রস্থ
            let scale = maxWidth / img.width;
            let width = scale < 1 ? maxWidth : img.width;
            let height = scale < 1 ? img.height * scale : img.height;

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // ছোট সাইজের Base64 তৈরি
            let compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);

            let newPhoto = { 
                url: compressedBase64, 
                title: caption, 
                album: album,
                date: new Date().toISOString()
            };

            // URL ফরম্যাট ঠিক করা
            let cleanUrl = FIREBASE_URL.replace(/\/+$/, "");

            fetch(`${cleanUrl}/gallery.json`, { 
                method: "POST", 
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newPhoto) 
            })
            .then(res => {
                if(!res.ok) throw new Error("Server responded with error");
                return res.json();
            })
            .then(() => {
                loadGallery();
                if(document.getElementById("galFile")) document.getElementById("galFile").value = ""; 
                if(document.getElementById("galCaption")) document.getElementById("galCaption").value = "";
                showFighterNotification("ছবি সফলভাবে গ্যালারিতে যোগ হয়েছে! 📸", "success");
            })
            .catch(err => {
                console.error("Upload error:", err);
                showFighterNotification("আপলোড ব্যর্থ হয়েছে! ব্রাউজারের Console চেক করুন।", "error");
            });
        };
    };
}

function deleteGallery(id) {
    if(confirm("ছবিটি মুছে ফেলতে চান?")) {
        fetch(`${FIREBASE_URL}/gallery/${id}.json`, { method: "DELETE" }).then(() => { 
            loadGallery(); 
            showFighterNotification("ছবিটি মুছে ফেলা হয়েছে।", "warning");
        });
    }
}

function filterGallery(albumName) {
    currentFilter = albumName;
    let btns = document.querySelectorAll('.filter-btn');
    btns.forEach(btn => btn.classList.remove('active'));
    if(window.event && window.event.target) { window.event.target.classList.add('active'); }
    renderGallery();
}

function renderGallery() {
    let container = document.getElementById("galleryGrid"); 
    if(!container) return; // galleryGrid না পেলে ডিরেক্টরি কন্টেইনারে ওভাররাইট করবে না
    container.innerHTML = "";
    
    galleryData.forEach(item => {
        if(currentFilter === 'All' || item.album === currentFilter) {
            let card = document.createElement("div");
            card.className = "gallery-card";
            card.innerHTML = `
                <img src="${item.url || 'https://via.placeholder.com/150'}" alt="Gallery Image" onclick="openLightbox('${item.url}', '${item.title || ''}')">
                <div class="gallery-info">
                    <h4>${item.title || 'গ্যালারি ছবি'}</h4>
                    ${isAdmin ? `<button onclick="deleteGallery('${item.id}')" style="background:red; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; margin-top:5px;">ডিলিট</button>` : ''}
                </div>
            `;
            container.appendChild(card);
        }
    });
}

function openLightbox(url, caption) {
    if(document.getElementById("lightboxImg")) document.getElementById("lightboxImg").src = url;
    if(document.getElementById("lightboxCaption")) document.getElementById("lightboxCaption").innerText = caption;
    if(document.getElementById("lightbox")) document.getElementById("lightbox").style.display = "flex";
}
function closeLightbox() { if(document.getElementById("lightbox")) document.getElementById("lightbox").style.display = "none"; }

function loadFeedback() {
    fetch(FIREBASE_URL + "/feedback.json").then(res => res.json()).then(serverData => {
        feedbackData = []; 
        if(serverData) { Object.keys(serverData).forEach(key => { feedbackData.push({ id: key, ...serverData[key] }); }); }
        renderFeedback();
    });
}

function sendFeedback() {
    let name = document.getElementById("fbName")?.value;
    let msg = document.getElementById("fbMsg")?.value;
    if(!name || !msg) return showFighterNotification("নাম ও মেসেজ দুটোই লিখুন!", "warning");
    
    fetch(FIREBASE_URL + "/feedback.json", { method: "POST", body: JSON.stringify({name, msg}) }).then(() => {
        loadFeedback();
        document.getElementById("fbName").value = ""; document.getElementById("fbMsg").value = "";
        showFighterNotification("পরামর্শ বোর্ড সাবমিট সফল!", "success");
    });
}

function delFeedback(id) {
    if(confirm("পরামর্শটি মুছে ফেলতে চান?")) {
        fetch(`${FIREBASE_URL}/feedback/${id}.json`, { method: "DELETE" }).then(() => { 
            loadFeedback(); 
            showFighterNotification("বার্তা মুছে ফেলা হয়েছে।", "warning");
        });
    }
}

function renderFeedback() {
    let fbList = document.getElementById("feedbackList"); 
    if(!fbList) return;
    fbList.innerHTML = "";
    if(feedbackData.length === 0) {
        fbList.innerHTML = "<p style='color:var(--text-muted); font-size:14px;'>এখনো কোনো পরামর্শ নেই।</p>";
        return;
    }
    feedbackData.forEach(f => {
        fbList.innerHTML += `
            <div class="msg-box">
                <div><strong>👤 ${f.name}:</strong> <span style="color: #cbd5e1; margin-left: 6px;">${f.msg}</span></div>
                ${isAdmin ? `<button class="btn-danger" style="padding:4px 10px; font-size:11px; border-radius:6px;" onclick="delFeedback('${f.id}')">Delete</button>` : ''}
            </div>`;
    });
}

function updateNotice() {
    let text = document.getElementById("newNotice")?.value;
    if(!text) return;
    fetch(FIREBASE_URL + "/notice.json", { method: "PUT", body: JSON.stringify(text) }).then(() => {
        if(document.getElementById("noticeText")) document.getElementById("noticeText").innerText = text;
        document.getElementById("newNotice").value = "";
        showFighterNotification("লাইভ নোটিশ আপডেট হয়েছে!", "success");
    });
}

function updateBirthdayWish() {
    let wish = document.getElementById("newBirthdayWish")?.value;
    if(!wish) return;
    fetch(FIREBASE_URL + "/birthday.json", { method: "PUT", body: JSON.stringify(wish) }).then(() => {
        activeBirthdayWish = wish;
        document.getElementById("newBirthdayWish").value = "";
        showFighterNotification("বার্থডে উইশ মেমোরি আপডেট সফল!", "success");
    });
}

function checkTodayBirthdays() {
    if (directoryData.length === 0) {
        alert("🎂 ডিরেক্টরি ডাটা লোড হচ্ছে, অনুগ্রহ করে একটু অপেক্ষা করুন।");
        return;
    }

    let today = new Date();
    let todayDay = today.getDate();
    let todayMonth = today.getMonth() + 1;

    let birthdayBoys = [];

    directoryData.forEach(member => {
        if (member.dob) {
            let memberBirthDate = new Date(member.dob);
            if (todayDay === memberBirthDate.getDate() && todayMonth === (memberBirthDate.getMonth() + 1)) {
                birthdayBoys.push(member.name);
            }
        }
    });

    if (birthdayBoys.length > 0) {
        alert(`🎂 শুভ জন্মদিন! 🎉\n\nআজ আমাদের ফাইটার ক্লাবের প্রিয় সদস্য [ ${birthdayBoys.join(", ")} ] এর জন্মদিন। সবাই তাকে শুভেচ্ছা জানান! 🥳✨`);
    } else {
        alert("🎂 আজ আমাদের ক্লাবের কোনো মেম্বারের জন্মদিন নেই। 🎉");
    }
}

function openMemberModal(memberName) {
    if(document.getElementById("modalMemberName")) document.getElementById("modalMemberName").innerText = `👤 ${memberName} - এর ব্যক্তিগত হিসাব`;
    let tableBody = document.getElementById("modalTableBody");
    if(!tableBody) return;
    tableBody.innerHTML = "";
    
    let totalPaid = 0;
    let totalDue = 0;
    
    accountsData.forEach(acc => {
        if(acc.member && acc.member.toLowerCase() === memberName.toLowerCase()) {
            let due = Number(acc.price || 0) - Number(acc.paid || 0);
            totalPaid += Number(acc.paid || 0);
            totalDue += due;
            
            tableBody.innerHTML += `
                <tr>
                    <td>${acc.item}</td>
                    <td>${acc.date}</td>
                    <td style="color:#10b981;">${acc.paid} ৳</td>
                    <td style="color:${due>0?'#ef4444':'#10b981'}; font-weight:bold;">${due} ৳</td>
                </tr>`;
        }
    });
    
    if(document.getElementById("modalTotalPaid")) document.getElementById("modalTotalPaid").innerText = totalPaid;
    if(document.getElementById("modalTotalDue")) document.getElementById("modalTotalDue").innerText = totalDue;
    if(document.getElementById("memberModal")) document.getElementById("memberModal").style.display = "flex";
}
function closeModal() { if(document.getElementById("memberModal")) document.getElementById("memberModal").style.display = "none"; }

function loadWeather() {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=25.3289&longitude=89.5395&current=temperature_2m,relative_humidity_2m")
    .then(res => res.json())
    .then(data => {
        if(data && data.current && document.getElementById("weatherDisplay")) {
            let temp = data.current.temperature_2m;
            let humidity = data.current.relative_humidity_2m;
            document.getElementById("weatherDisplay").innerText = `☀️ তাপমাত্রা: ${temp}°C | 💧 আর্দ্রতা: ${humidity}% | ক্রিকেট খেলার জন্য আবহাওয়া চমৎকার! 🏏`;
        }
    }).catch(() => {
        if(document.getElementById("weatherDisplay")) document.getElementById("weatherDisplay").innerText = "☀️ তাপমাত্রা: ২৯°C | ক্রিকেট খেলার জন্য আবহাওয়া একদম অনুকূল!";
    });
}

function toggleCalculator() {
    let calc = document.getElementById("calculatorWidget");
    if(calc) calc.style.display = (calc.style.display === "block") ? "none" : "block";
}
function p(val) { if(document.getElementById("display")) document.getElementById("display").value += val; }
function clearCalc() { if(document.getElementById("display")) document.getElementById("display").value = ""; }
function calc() {
    try {
        let result = eval(document.getElementById("display").value);
        document.getElementById("display").value = result;
    } catch(err) {
        if(document.getElementById("display")) document.getElementById("display").value = "Error";
    }
}

const PHONE_PASSWORD = "fightermember2026";

function showPhone(phone) {
    const pass = prompt("📞 ফোন নম্বর দেখতে পাসওয়ার্ড দিন:");
    if (pass === null) return;
    if (pass === PHONE_PASSWORD) {
        alert("📞 ফোন নম্বর: " + phone);
    } else {
        showFighterNotification("❌ ভুল পাসওয়ার্ড!", "error");
    }
}

let newWorker;

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js")
    .then(reg => {
        console.log("Service Worker Registered");
        reg.addEventListener("updatefound", () => {
            newWorker = reg.installing;
            newWorker.addEventListener("statechange", () => {
                if(newWorker.state === "installed" && navigator.serviceWorker.controller) {
                    let popup = document.getElementById("updatePopup");
                    if(popup) popup.style.display = "flex";
                }
            });
        });
        
        let updateBtn = document.getElementById("updateNow");
        if(updateBtn) {
            updateBtn.onclick = function() {
                if(reg.waiting) {
                    reg.waiting.postMessage({ type: "SKIP_WAITING" });
                }
                location.reload();
            };
        }
    })
    .catch(err => console.log(err));
}

function updateApp() {
    if(newWorker) {
        newWorker.postMessage({ action: 'skipWaiting' });
    }
    location.reload();
}

function closeUpdatePopup() {
    let popup = document.getElementById('updatePopup');
    if(popup) popup.style.display = 'none';
}

window.addEventListener("scroll", () => {
    const winScroll = document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    let progressBar = document.getElementById("progressBar");
    if(progressBar) progressBar.style.width = scrolled + "%";
});

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleSettings() {
    let panel = document.getElementById("settingsPanel");
    if(panel) panel.classList.toggle("active");
}

function changeTheme(color) {
    document.documentElement.style.setProperty("--primary", color);
    showFighterNotification("Theme Changed!", "success");
}

function closeWelcome() {
    let popup = document.getElementById("welcomePopup");
    if(popup) popup.style.display = "none";
}

function toggleAI() {
    const box = document.getElementById("aiBox");
    if(box) box.style.display = box.style.display === "block" ? "none" : "block";
}

function askAI(type) {
    let answer = "";
    switch(type) {
        case "members":
            answer = "👥 বর্তমানে ক্লাবের Member তালিকা Member Directory-তে দেখতে পারবেন।";
            break;
        case "notice":
            answer = "📢 সর্বশেষ Notice দেখতে Notice Board খুলুন।";
            break;
        case "weather":
            answer = "🌦 আজকের আবহাওয়া Dashboard-এর Weather Card-এ দেখানো হচ্ছে।";
            break;
        case "about":
            answer = "🏏 FIGHTER Cricket Club একটি আধুনিক ক্রিকেট ক্লাব ম্যানেজমেন্ট প্ল্যাটফর্ম।";
            break;
    }
    let aiMsgs = document.getElementById("aiMessages");
    if(aiMsgs) {
        aiMsgs.innerHTML += `<div class="ai-msg">${answer}</div>`;
        aiMsgs.scrollTop = aiMsgs.scrollHeight;
    }
}

/* ===== Hero Banner Slider ===== */
const slides = document.querySelectorAll(".hero-slide");
const dots = document.querySelectorAll(".hero-dots span");
let currentSlide = 0;

if(slides.length > 0) {
    setInterval(() => {
        slides[currentSlide].classList.remove("active");
        if(dots[currentSlide]) dots[currentSlide].classList.remove("active");

        currentSlide = (currentSlide + 1) % slides.length;

        slides[currentSlide].classList.add("active");
        if(dots[currentSlide]) dots[currentSlide].classList.add("active");
    }, 5000);
}

let notifications = [
    { title: "📢 Match Update", message: "FIGHTER vs Warriors আগামীকাল বিকাল ৩:৩০", time: "Today" },
    { title: "🎂 Birthday", message: "আজ রাহিমের জন্মদিন 🎉", time: "Today" },
    { title: "📢 Admin Message", message: "শুক্রবার সকাল ৮টায় প্র্যাকটিস", time: "2 Hours Ago" },
    { title: "🏆 Tournament", message: "Registration Started", time: "Yesterday" },
    { title: "💰 Payment Reminder", message: "আপনার ২০০ টাকা বাকি আছে।", time: "Yesterday" }
];

function loadNotifications() {
    const box = document.getElementById("notificationList");
    if(!box) return;
    box.innerHTML = "";
    notifications.forEach(n => {
        box.innerHTML += `
            <div class="notification-item">
                <div class="notification-title">${n.title}</div>
                <div>${n.message}</div>
                <div class="notification-time">${n.time}</div>
            </div>`;
    });
    let countElem = document.getElementById("notificationCount");
    if(countElem) countElem.innerText = notifications.length;
}

function toggleNotifications() {
    let panel = document.getElementById("notificationPanel");
    if(panel) panel.style.display = panel.style.display === "block" ? "none" : "block";
}

function clearNotifications() {
    notifications = [];
    loadNotifications();
}

function updateClock() {
    const now = new Date();
    let clock = document.getElementById("clock");
    if(clock) clock.innerHTML = now.toLocaleTimeString();
}
setInterval(updateClock, 1000);

window.addEventListener("scroll", () => {
    const reveals = document.querySelectorAll(".reveal");
    reveals.forEach(el => {
        const top = el.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        if(top < windowHeight - 120) {
            el.classList.add("active");
        }
    });
});

/* ===========================
   Premium Mouse Trail
=========================== */
if(window.matchMedia("(pointer:fine)").matches) {
    document.addEventListener("mousemove", function(e) {
        const trail = document.createElement("div");
        trail.className = "mouse-trail";
        trail.style.left = e.clientX + "px";
        trail.style.top = e.clientY + "px";
        document.body.appendChild(trail);
        setTimeout(() => { trail.remove(); }, 700);
    });
}

function toggleMenu() {
    let navLinks = document.querySelector(".nav-links");
    if(navLinks) navLinks.classList.toggle("active");
}

document.querySelectorAll(".nav-links a").forEach(link => {
    link.onclick = () => {
        let navLinks = document.querySelector(".nav-links");
        if(navLinks) navLinks.classList.remove("active");
    };
});

window.addEventListener("scroll", () => {
    const nav = document.querySelector(".navbar");
    if(nav) {
        if(window.scrollY > 30) nav.classList.add("scrolled");
        else nav.classList.remove("scrolled");
    }
});

// Premium Mouse 3D Effect
document.querySelectorAll(".pro-card,.box,.member-card,.gallery-item").forEach(card => {
    card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rotateY = ((x / rect.width) - 0.5) * 14;
        const rotateX = ((rect.height / 2 - y) / rect.height) * 14;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
    });

    card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
    });
});

// Scroll Reveal
const reveals = document.querySelectorAll(".pro-card,.box,.member-card,.gallery-item,.weather-widget,.notice-board");
reveals.forEach(el => { el.classList.add("reveal"); });

function revealOnScroll() {
    reveals.forEach(el => {
        const top = el.getBoundingClientRect().top;
        const visible = window.innerHeight - 80;
        if(top < visible) el.classList.add("active");
    });
}
window.addEventListener("scroll", revealOnScroll);

// Cursor Glow
const glow = document.querySelector(".cursor-glow");
if(glow) {
    document.addEventListener("mousemove", (e) => {
        glow.style.left = e.clientX + "px";
        glow.style.top = e.clientY + "px";
    });
}

/* =====================================================
   FIGHTER TOURNAMENT SYSTEM (Cricket + Football)
===================================================== */
let tournamentData = JSON.parse(localStorage.getItem("fighterTournament")) || {
    sport: "cricket",
    name: "FIGHTER Championship",
    season: "2026",
    format: "league",
    teams: [],
    matches: []
};

function saveTournamentData() {
    localStorage.setItem("fighterTournament", JSON.stringify(tournamentData));
}

function initTournament() {
    updateTournamentUI();
    renderTournamentTeams();
    updateMatchTeamSelectors();
    renderTournamentMatches();
    renderPointsTable();
}

function changeTournamentSport(sport) {
    tournamentData.sport = sport;
    saveTournamentData();
    updateTournamentUI();
    updateMatchTeamSelectors();
    renderTournamentMatches();
    renderPointsTable();
}

function changeAdminSport() {
    const sport = document.getElementById("tournamentSport")?.value;
    if(sport) {
        tournamentData.sport = sport;
        saveTournamentData();
        updateTournamentUI();
        updateMatchTeamSelectors();
        renderPointsTable();
    }
}

function updateTournamentUI() {
    const sport = tournamentData.sport;
    const name = document.getElementById("displayTournamentName");
    const season = document.getElementById("displayTournamentSeason");
    const sportDisplay = document.getElementById("displayTournamentSport");

    if (name) name.textContent = tournamentData.name || "No Tournament";
    if (season) season.textContent = tournamentData.season || "2026";
    if (sportDisplay) sportDisplay.textContent = sport === "football" ? "⚽ Football" : "🏏 Cricket";

    const cricketBtn = document.getElementById("cricketSportBtn");
    const footballBtn = document.getElementById("footballSportBtn");

    if (cricketBtn) cricketBtn.classList.toggle("active", sport === "cricket");
    if (footballBtn) footballBtn.classList.toggle("active", sport === "football");

    const adminSport = document.getElementById("tournamentSport");
    if (adminSport) adminSport.value = sport;
}

function saveTournament() {
    const name = document.getElementById("tournamentName")?.value.trim();
    const season = document.getElementById("tournamentSeason")?.value.trim();
    const sport = document.getElementById("tournamentSport")?.value;
    const format = document.getElementById("tournamentFormat")?.value;

    if (!name) { alert("Tournament Name দিন।"); return; }

    tournamentData.name = name;
    tournamentData.season = season || "2026";
    tournamentData.sport = sport;
    tournamentData.format = format;

    saveTournamentData();
    updateTournamentUI();
    renderPointsTable();
    showTournamentMessage("🏆 Tournament Saved!");
}

function addTournamentTeam() {
    const input = document.getElementById("newTeamName");
    if(!input) return;
    const name = input.value.trim();

    if (!name) { alert("Team Name দিন।"); return; }

    const exists = tournamentData.teams.some(team => team.name.toLowerCase() === name.toLowerCase());
    if (exists) { alert("এই Team ইতিমধ্যে আছে।"); return; }

    tournamentData.teams.push({ id: Date.now(), name: name });
    input.value = "";

    saveTournamentData();
    renderTournamentTeams();
    updateMatchTeamSelectors();
    renderPointsTable();
}

function deleteTournamentTeam(id) {
    const team = tournamentData.teams.find(t => t.id === id);
    if (!team) return;

    const used = tournamentData.matches.some(match => match.teamA === team.id || match.teamB === team.id);
    if (used) { alert("এই Team-এর Match আছে। আগে Match delete করুন।"); return; }

    tournamentData.teams = tournamentData.teams.filter(t => t.id !== id);

    saveTournamentData();
    renderTournamentTeams();
    updateMatchTeamSelectors();
    renderPointsTable();
}

function renderTournamentTeams() {
    const container = document.getElementById("tournamentTeamAdminList");
    if (!container) return;

    if (tournamentData.teams.length === 0) {
        container.innerHTML = "<p style='color:var(--text-muted)'>কোনো Team নেই।</p>";
        return;
    }

    container.innerHTML = tournamentData.teams.map(team => `
        <div class="team-admin-item">
            <span>${escapeTournamentHTML(team.name)}</span>
            <button onclick="deleteTournamentTeam(${team.id})">✕</button>
        </div>
    `).join("");
}

function updateMatchTeamSelectors() {
    const a = document.getElementById("matchTeamA");
    const b = document.getElementById("matchTeamB");
    if (!a || !b) return;

    const options = tournamentData.teams.map(team => `
        <option value="${team.id}">${escapeTournamentHTML(team.name)}</option>
    `).join("");

    a.innerHTML = "<option value=''>Team A</option>" + options;
    b.innerHTML = "<option value=''>Team B</option>" + options;
}

function addTournamentMatch() {
    const teamA = Number(document.getElementById("matchTeamA")?.value);
    const teamB = Number(document.getElementById("matchTeamB")?.value);
    const scoreA = Number(document.getElementById("matchScoreA")?.value);
    const scoreB = Number(document.getElementById("matchScoreB")?.value);
    const date = document.getElementById("matchDate")?.value;

    if (!teamA || !teamB) { alert("দুইটি Team নির্বাচন করুন।"); return; }
    if (teamA === teamB) { alert("একই Team-এর বিরুদ্ধে নিজেকেই Match দেওয়া যাবে না।"); return; }
    if (isNaN(scoreA) || isNaN(scoreB)) { alert("দুই Team-এর Score দিন।"); return; }

    tournamentData.matches.push({
        id: Date.now(),
        teamA: teamA,
        teamB: teamB,
        scoreA: scoreA,
        scoreB: scoreB,
        date: date || new Date().toISOString().split("T")[0],
        sport: tournamentData.sport
    });

    saveTournamentData();
    if(document.getElementById("matchScoreA")) document.getElementById("matchScoreA").value = "";
    if(document.getElementById("matchScoreB")) document.getElementById("matchScoreB").value = "";

    renderTournamentMatches();
    renderPointsTable();
    showTournamentMessage("🏆 Match Result Saved!");
}

function deleteTournamentMatch(id) {
    if (!confirm("এই Match delete করতে চান?")) return;
    tournamentData.matches = tournamentData.matches.filter(match => match.id !== id);

    saveTournamentData();
    renderTournamentMatches();
    renderPointsTable();
}

function renderTournamentMatches() {
    const container = document.getElementById("tournamentMatches");
    if (!container) return;

    const sport = tournamentData.sport;
    const matches = tournamentData.matches.filter(match => match.sport === sport);

    if (matches.length === 0) {
        container.innerHTML = `
            <div class="match-card">
                <div style="font-size:40px;">${sport === "football" ? "⚽" : "🏏"}</div>
                <p>এখনো কোনো Match Result নেই।</p>
            </div>`;
        return;
    }

    container.innerHTML = matches.slice().reverse().map(match => {
        const teamA = tournamentData.teams.find(t => t.id === match.teamA);
        const teamB = tournamentData.teams.find(t => t.id === match.teamB);
        if (!teamA || !teamB) return "";

        let result = "";
        if (match.scoreA > match.scoreB) result = `${teamA.name} Won`;
        else if (match.scoreB > match.scoreA) result = `${teamB.name} Won`;
        else result = sport === "football" ? "Match Draw" : "Match Tied";

        return `
            <div class="match-card">
                <div class="match-sport">${sport === "football" ? "⚽ FOOTBALL" : "🏏 CRICKET"}</div>
                <div class="match-teams">
                    <span>${escapeTournamentHTML(teamA.name)}</span>
                    <span class="match-score">${match.scoreA} - ${match.scoreB}</span>
                    <span>${escapeTournamentHTML(teamB.name)}</span>
                </div>
                <div class="match-result">${escapeTournamentHTML(result)}</div>
                <div class="match-date">📅 ${match.date}</div>
                <button class="btn-danger" style="margin-top:12px;" onclick="deleteTournamentMatch(${match.id})">🗑 Delete</button>
            </div>`;
    }).join("");
}

function calculateTournamentStats() {
    const stats = {};
    tournamentData.teams.forEach(team => {
        stats[team.id] = { id: team.id, name: team.name, played: 0, wins: 0, draws: 0, losses: 0, points: 0, gf: 0, ga: 0, gd: 0, runsFor: 0, runsAgainst: 0, nrr: 0 };
    });

    tournamentData.matches.filter(match => match.sport === tournamentData.sport).forEach(match => {
        const A = stats[match.teamA];
        const B = stats[match.teamB];
        if (!A || !B) return;

        A.played++; B.played++;

        if (tournamentData.sport === "football") {
            A.gf += match.scoreA; A.ga += match.scoreB;
            B.gf += match.scoreB; B.ga += match.scoreA;
            A.gd = A.gf - A.ga; B.gd = B.gf - B.ga;

            if (match.scoreA > match.scoreB) { A.wins++; A.points += 3; B.losses++; }
            else if (match.scoreB > match.scoreA) { B.wins++; B.points += 3; A.losses++; }
            else { A.draws++; B.draws++; A.points++; B.points++; }
        } else {
            A.runsFor += match.scoreA; A.runsAgainst += match.scoreB;
            B.runsFor += match.scoreB; B.runsAgainst += match.scoreA;

            if (match.scoreA > match.scoreB) { A.wins++; A.points += 2; B.losses++; }
            else if (match.scoreB > match.scoreA) { B.wins++; B.points += 2; A.losses++; }
            else { A.draws++; B.draws++; A.points++; B.points++; }

            A.nrr = A.runsAgainst === 0 ? A.runsFor : (A.runsFor / A.played) - (A.runsAgainst / A.played);
            B.nrr = B.runsAgainst === 0 ? B.runsFor : (B.runsFor / B.played) - (B.runsAgainst / B.played);
        }
    });

    return Object.values(stats);
}

function renderPointsTable() {
    const head = document.getElementById("pointsTableHead");
    const body = document.getElementById("pointsTableBody");
    if (!head || !body) return;

    const sport = tournamentData.sport;
    let stats = calculateTournamentStats();

    if (sport === "football") {
        stats.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
        head.innerHTML = `<tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>PTS</th></tr>`;
        body.innerHTML = stats.map((team, index) => `
            <tr>
                <td class="rank-number">${index + 1}</td>
                <td class="team-name">⚽ ${escapeTournamentHTML(team.name)}</td>
                <td>${team.played}</td><td>${team.wins}</td><td>${team.draws}</td><td>${team.losses}</td>
                <td>${team.gf}</td><td>${team.ga}</td><td>${team.gd}</td>
                <td><strong>${team.points}</strong></td>
            </tr>`).join("");
    } else {
        stats.sort((a, b) => b.points - a.points || b.nrr - a.nrr);
        head.innerHTML = `<tr><th>#</th><th>Team</th><th>M</th><th>W</th><th>L</th><th>T</th><th>PTS</th><th>NRR</th></tr>`;
        body.innerHTML = stats.map((team, index) => `
            <tr>
                <td class="rank-number">${index + 1}</td>
                <td class="team-name">🏏 ${escapeTournamentHTML(team.name)}</td>
                <td>${team.played}</td><td>${team.wins}</td><td>${team.losses}</td><td>${team.draws}</td>
                <td><strong>${team.points}</strong></td>
                <td>${Number(team.nrr).toFixed(2)}</td>
            </tr>`).join("");
    }
}

function toggleTournamentAdmin() {
    const panel = document.getElementById("tournamentAdminPanel");
    if (!panel) return;
    const isHidden = panel.style.display === "none";
    panel.style.display = isHidden ? "block" : "none";

    if (isHidden) {
        if(document.getElementById("tournamentName")) document.getElementById("tournamentName").value = tournamentData.name || "";
        if(document.getElementById("tournamentSeason")) document.getElementById("tournamentSeason").value = tournamentData.season || "2026";
        if(document.getElementById("tournamentSport")) document.getElementById("tournamentSport").value = tournamentData.sport;
        if(document.getElementById("tournamentFormat")) document.getElementById("tournamentFormat").value = tournamentData.format || "league";
    }
}

function showTournamentAdminForAdmin() {
    const panel = document.getElementById("tournamentAdminPanel");
    if (panel) panel.style.display = "block";
}

function showTournamentMessage(message) {
    showFighterNotification(message, "success");
}

function escapeTournamentHTML(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/* =====================================================
   FIGHTER MEMBER REGISTRATION + DIGITAL RECEIPT
===================================================== */
let fighterApplications = JSON.parse(localStorage.getItem("fighterMemberApplications")) || [];
let fighterApprovedMembers = JSON.parse(localStorage.getItem("fighterApprovedMembers")) || [];
let fighterReceipts = JSON.parse(localStorage.getItem("fighterPaymentReceipts")) || [];

function saveMembershipData() {
    localStorage.setItem("fighterMemberApplications", JSON.stringify(fighterApplications));
    localStorage.setItem("fighterApprovedMembers", JSON.stringify(fighterApprovedMembers));
    localStorage.setItem("fighterPaymentReceipts", JSON.stringify(fighterReceipts));
}

function generateApplicationId() {
    const year = new Date().getFullYear();
    const number = String(fighterApplications.length + 1).padStart(4, "0");
    return `FMA-${year}-${number}`;
}

function generateMemberId() {
    const year = new Date().getFullYear();
    const number = String(fighterApprovedMembers.length + 1).padStart(4, "0");
    return `FMC-${year}-${number}`;
}

function generateReceiptId() {
    const year = new Date().getFullYear();
    const number = String(fighterReceipts.length + 1).padStart(4, "0");
    return `FCR-${year}-${number}`;
}

function submitMemberApplication() {
    const name = document.getElementById("regName")?.value.trim();
    const phone = document.getElementById("regPhone")?.value.trim();
    const email = document.getElementById("regEmail")?.value.trim();
    const dob = document.getElementById("regDOB")?.value;
    const blood = document.getElementById("regBlood")?.value;
    const sport = document.getElementById("regSport")?.value;
    const position = document.getElementById("regPosition")?.value.trim();
    const address = document.getElementById("regAddress")?.value.trim();
    const message = document.getElementById("regMessage")?.value.trim();
    const photoInput = document.getElementById("regPhoto");

    if (!name || !phone || !sport) {
        alert("নাম, মোবাইল নম্বর এবং Sport অবশ্যই দিতে হবে।");
        return;
    }

    const duplicate = fighterApplications.some(app => app.phone === phone && app.status === "pending");
    if (duplicate) {
        alert("এই মোবাইল নম্বর দিয়ে একটি application ইতিমধ্যে pending আছে।");
        return;
    }

    if (photoInput && photoInput.files && photoInput.files[0]) {
        const file = photoInput.files[0];
        if (!file.type.startsWith("image/")) {
            alert("শুধু Image upload করা যাবে।");
            return;
        }

        const reader = new FileReader();
        reader.onload = function () {
            createMemberApplication(name, phone, email, dob, blood, sport, position, address, message, reader.result);
        };
        reader.readAsDataURL(file);
    } else {
        createMemberApplication(name, phone, email, dob, blood, sport, position, address, message, "");
    }
}

function createMemberApplication(name, phone, email, dob, blood, sport, position, address, message, photo) {
    const applicationId = generateApplicationId();
    const application = {
        id: applicationId, name, phone, email, dob, blood, sport, position, address, message, photo,
        status: "pending", submittedAt: new Date().toISOString()
    };

    fighterApplications.push(application);
    saveMembershipData();
    clearRegistrationForm();

    if(document.getElementById("statusApplicationId")) document.getElementById("statusApplicationId").value = applicationId;

    alert(`Application সফলভাবে জমা হয়েছে!\n\nApplication ID: ${applicationId}\n\nএই ID সংরক্ষণ করে রাখুন।`);
    renderMembershipSystem();
}

function clearRegistrationForm() {
    ["regName", "regPhone", "regEmail", "regDOB", "regBlood", "regSport", "regPosition", "regAddress", "regMessage", "regPhoto"].forEach(id => {
        let el = document.getElementById(id);
        if (el) el.value = "";
    });
}

function checkMemberApplication() {
    const id = document.getElementById("statusApplicationId")?.value.trim().toUpperCase();
    if (!id) { alert("Application ID দিন।"); return; }

    const application = fighterApplications.find(item => item.id.toUpperCase() === id);
    const result = document.getElementById("applicationStatusResult");
    if(!result) return;

    if (!application) {
        result.innerHTML = `<div class="application-status-card status-rejected">❌ Application পাওয়া যায়নি।</div>`;
        return;
    }

    let statusText = "", statusClass = "";
    if (application.status === "pending") {
        statusText = "⏳ আপনার Application এখনো Review করা হয়নি।"; statusClass = "status-pending";
    } else if (application.status === "approved") {
        statusText = `✅ আপনার Application Approved হয়েছে।<br>Member ID: <strong>${application.memberId}</strong>`; statusClass = "status-approved";
    } else {
        statusText = "❌ আপনার Application Reject করা হয়েছে।"; statusClass = "status-rejected";
    }

    result.innerHTML = `
        <div class="application-status-card ${statusClass}">
            <strong>${escapeMembershipHTML(application.name)}</strong><br>
            Application: ${application.id}<br>
            Status: ${statusText}
        </div>`;
}

function showMembershipAdmin() {
    const panel = document.getElementById("membershipAdminPanel");
    if (panel) panel.style.display = "block";
    renderMembershipSystem();
}

function hideMembershipAdmin() {
    const panel = document.getElementById("membershipAdminPanel");
    if (panel) panel.style.display = "none";
}

function renderMembershipSystem() {
    renderAdminApplications();
    renderApprovedMembers();
    renderReceiptMemberSelect();
    renderReceiptHistory();
    updateMembershipStats();
}

function renderAdminApplications() {
    const container = document.getElementById("pendingApplicationsContainer");
    if (!container) return;

    const pending = fighterApplications.filter(app => app.status === "pending");
    if (pending.length === 0) {
        container.innerHTML = `<div class="admin-application-card">💤 কোনো Pending Application নেই।</div>`;
        return;
    }

    container.innerHTML = pending.map(app => `
        <div class="admin-application-card">
            <div class="admin-application-top">
                <div>
                    <strong>${escapeMembershipHTML(app.name)}</strong>
                    <div>Application ID: <b>${app.id}</b></div>
                </div>
                <span class="status-pending">⏳ Pending</span>
            </div>
            <p>📱 ${escapeMembershipHTML(app.phone)}</p>
            <p>🏏⚽ Sport: ${escapeMembershipHTML(app.sport)}</p>
            <p>🩸 Blood: ${escapeMembershipHTML(app.blood || "-")}</p>
            <p>📍 ${escapeMembershipHTML(app.address || "-")}</p>
            <p>💬 ${escapeMembershipHTML(app.message || "-")}</p>
            ${app.photo ? `<img src="${app.photo}" style="width:70px; height:70px; object-fit:cover; border-radius:50%;">` : ""}
            <div class="admin-application-actions">
                <button class="approve-btn" onclick="approveMemberApplication('${app.id}')">✅ Approve</button>
                <button class="reject-btn" onclick="rejectMemberApplication('${app.id}')">❌ Reject</button>
                <button class="delete-btn" onclick="deleteMemberApplication('${app.id}')">🗑 Delete</button>
            </div>
        </div>`).join("");
}

function approveMemberApplication(applicationId) {
    const application = fighterApplications.find(item => item.id === applicationId);
    if (!application) return;

    if (!confirm(`${application.name}-কে Member হিসেবে Approve করবেন?`)) return;

    const memberId = generateMemberId();
    application.status = "approved";
    application.memberId = memberId;
    application.approvedAt = new Date().toISOString();

    fighterApprovedMembers.push({
        memberId, applicationId: application.id, name: application.name, phone: application.phone,
        email: application.email, dob: application.dob, blood: application.blood, sport: application.sport,
        position: application.position, address: application.address, photo: application.photo, joinedAt: new Date().toISOString()
    });

    saveMembershipData();
    renderMembershipSystem();
    alert(`✅ Member Approved!\n\nMember ID: ${memberId}`);
}

function rejectMemberApplication(applicationId) {
    const application = fighterApplications.find(item => item.id === applicationId);
    if (!application) return;

    const reason = prompt("Reject করার কারণ লিখুন:");
    if (reason === null) return;

    application.status = "rejected";
    application.rejectReason = reason;
    application.rejectedAt = new Date().toISOString();

    saveMembershipData();
    renderMembershipSystem();
    alert("❌ Application rejected.");
}

function deleteMemberApplication(applicationId) {
    if (!confirm("এই Application delete করবেন?")) return;
    fighterApplications = fighterApplications.filter(item => item.id !== applicationId);
    saveMembershipData();
    renderMembershipSystem();
}

function renderApprovedMembers() {
    const container = document.getElementById("approvedMembersContainer");
    if (container) {
        if (fighterApprovedMembers.length === 0) {
            container.innerHTML = `<div class="approved-member-card">এখনো কোনো Approved Member নেই।</div>`;
        } else {
            container.innerHTML = fighterApprovedMembers.map(member => `
                <div class="approved-member-card">
                    ${member.photo ? `<img src="${member.photo}" alt="Member">` : `<div style="width:80px; height:80px; border-radius:50%; margin:auto; display:flex; align-items:center; justify-content:center; background:#1e293b; font-size:35px;">👤</div>`}
                    <h4>${escapeMembershipHTML(member.name)}</h4>
                    <span class="member-id-badge">${member.memberId}</span>
                    <p>📱 ${escapeMembershipHTML(member.phone)}</p>
                    <p>🏏⚽ ${escapeMembershipHTML(member.sport)}</p>
                    <p>🩸 ${escapeMembershipHTML(member.blood || "-")}</p>
                </div>`).join("");
        }
    }

    const adminContainer = document.getElementById("adminApprovedMembersContainer");
    if (adminContainer) {
        adminContainer.innerHTML = fighterApprovedMembers.map(member => `
            <div class="admin-application-card">
                <strong>${escapeMembershipHTML(member.name)}</strong><br>
                Member ID: <b>${member.memberId}</b><br>
                📱 ${escapeMembershipHTML(member.phone)}
                <div class="admin-application-actions">
                    <button class="delete-btn" onclick="deleteApprovedMember('${member.memberId}')">🗑 Delete Member</button>
                </div>
            </div>`).join("");
    }
}

function deleteApprovedMember(memberId) {
    if (!confirm("এই Member delete করবেন?")) return;
    fighterApprovedMembers = fighterApprovedMembers.filter(member => member.memberId !== memberId);
    saveMembershipData();
    renderMembershipSystem();
}

function updateMembershipStats() {
    const pending = fighterApplications.filter(item => item.status === "pending").length;
    const approved = fighterApplications.filter(item => item.status === "approved").length;
    const rejected = fighterApplications.filter(item => item.status === "rejected").length;

    if (document.getElementById("pendingApplicationCount")) document.getElementById("pendingApplicationCount").textContent = pending;
    if (document.getElementById("approvedApplicationCount")) document.getElementById("approvedApplicationCount").textContent = approved;
    if (document.getElementById("rejectedApplicationCount")) document.getElementById("rejectedApplicationCount").textContent = rejected;
}

function renderReceiptMemberSelect() {
    const select = document.getElementById("receiptMemberSelect");
    if (!select) return;

    select.innerHTML = `<option value="">Member নির্বাচন করুন</option>`;
    fighterApprovedMembers.forEach(member => {
        const option = document.createElement("option");
        option.value = member.memberId;
        option.textContent = `${member.name} — ${member.memberId}`;
        select.appendChild(option);
    });
}

function createPaymentReceipt() {
    const memberId = document.getElementById("receiptMemberSelect")?.value;
    const amount = Number(document.getElementById("receiptAmount")?.value);
    const purpose = document.getElementById("receiptPurpose")?.value;
    const note = document.getElementById("receiptNote")?.value.trim();

    if (!memberId) { alert("একজন Member নির্বাচন করুন।"); return; }
    if (!amount || amount <= 0) { alert("সঠিক Amount দিন।"); return; }

    const member = fighterApprovedMembers.find(item => item.memberId === memberId);
    if (!member) return;

    const receipt = {
        id: generateReceiptId(), memberId: member.memberId, memberName: member.name,
        phone: member.phone, amount, purpose, note, date: new Date().toISOString()
    };

    fighterReceipts.push(receipt);
    saveMembershipData();
    renderReceiptHistory();
    showReceipt(receipt);

    if(document.getElementById("receiptAmount")) document.getElementById("receiptAmount").value = "";
    if(document.getElementById("receiptNote")) document.getElementById("receiptNote").value = "";
}

function showReceipt(receipt) {
    if(document.getElementById("receiptViewId")) document.getElementById("receiptViewId").textContent = receipt.id;
    if(document.getElementById("receiptViewDate")) document.getElementById("receiptViewDate").textContent = formatReceiptDate(receipt.date);
    if(document.getElementById("receiptViewName")) document.getElementById("receiptViewName").textContent = receipt.memberName;
    if(document.getElementById("receiptViewMemberId")) document.getElementById("receiptViewMemberId").textContent = receipt.memberId;
    if(document.getElementById("receiptViewPhone")) document.getElementById("receiptViewPhone").textContent = receipt.phone;
    if(document.getElementById("receiptViewPurpose")) document.getElementById("receiptViewPurpose").textContent = receipt.purpose;
    if(document.getElementById("receiptViewAmount")) document.getElementById("receiptViewAmount").textContent = `৳${receipt.amount.toLocaleString()}`;
    if(document.getElementById("receiptViewNote")) document.getElementById("receiptViewNote").textContent = receipt.note || "-";
    if(document.getElementById("receiptViewTotal")) document.getElementById("receiptViewTotal").textContent = `৳${receipt.amount.toLocaleString()}`;

    if(document.getElementById("receiptModal")) document.getElementById("receiptModal").classList.add("show");
}

function closeReceiptModal() {
    const modal = document.getElementById("receiptModal");
    if (modal) modal.classList.remove("show");
}

function printPaymentReceipt() {
    const receipt = document.getElementById("printableReceipt");
    if (!receipt) return;

    const printWindow = window.open("", "_blank", "width=800,height=900");
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>FIGHTER Payment Receipt</title>
            <style>
                * { box-sizing: border-box; }
                body { font-family: Arial, sans-serif; margin: 0; padding: 30px; color: #111827; }
                .printable-receipt { max-width: 700px; margin: auto; }
                .receipt-top { display: flex; align-items: center; gap: 15px; }
                .receipt-top img { width: 70px; height: 70px; object-fit: contain; }
                .receipt-top h2 { margin: 0; }
                .receipt-top p { color: #64748b; }
                .receipt-line { height: 2px; background: #111827; margin: 20px 0; }
                .receipt-info { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                .receipt-info div { padding: 12px; background: #f1f5f9; }
                .receipt-info span { display: block; font-size: 12px; color: #64748b; }
                .receipt-member, .receipt-payment { margin-top: 25px; }
                .receipt-member h3, .receipt-payment h3 { border-bottom: 1px solid #ddd; padding-bottom: 8px; }
                .receipt-payment-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                .receipt-total { margin-top: 20px; padding: 15px; text-align: right; background: #f1f5f9; font-size: 20px; }
                .receipt-footer { text-align: center; margin-top: 30px; color: #64748b; }
            </style>
        </head>
        <body>
            ${receipt.innerHTML}
            <script>window.onload = function() { window.print(); };<\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function renderReceiptHistory() {
    const container = document.getElementById("receiptHistoryContainer");
    if (!container) return;

    if (fighterReceipts.length === 0) {
        container.innerHTML = `<div class="admin-application-card">🧾 এখনো কোনো Receipt তৈরি হয়নি।</div>`;
        return;
    }

    container.innerHTML = fighterReceipts.slice().reverse().map(receipt => `
        <div class="admin-application-card">
            <strong>${escapeMembershipHTML(receipt.id)}</strong><br>
            👤 ${escapeMembershipHTML(receipt.memberName)}<br>
            💰 ৳${receipt.amount.toLocaleString()}<br>
            📋 ${escapeMembershipHTML(receipt.purpose)}<br>
            📅 ${formatReceiptDate(receipt.date)}
            <div class="admin-application-actions">
                <button class="approve-btn" onclick='showReceipt(${JSON.stringify(receipt)})'>🧾 View Receipt</button>
            </div>
        </div>`).join("");
}

function formatReceiptDate(date) {
    return new Date(date).toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" });
}

function escapeMembershipHTML(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/* =====================================================
   START / INITIALIZATION
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
    initDashboard();
    initTournament();
    renderMembershipSystem();
    loadNotifications();
});
// ওয়েবসাইট লোড হওয়ার সাথে সাথে গ্যালারি ও অন্যান্য ডাটা লোড করার জন্য
document.addEventListener("DOMContentLoaded", function() {
    if (typeof loadGallery === "function") loadGallery();
    if (typeof render === "function") render();
    if (typeof renderDirectory === "function") renderDirectory();
});
let newsData = [];

// ফায়ারবেজ থেকে নিউজ লোড করা
function loadNews() {
    fetch(FIREBASE_URL + "/news.json")
    .then(res => res.json())
    .then(serverData => {
        newsData = [];
        if(serverData) {
            Object.keys(serverData).forEach(key => {
                newsData.push({ id: key, ...serverData[key] });
            });
        }
        renderNews();
    });
}

// নতুন নিউজ আপলোড করা (Admin Only)
function addNews() {
    let title = document.getElementById("newsTitle")?.value;
    let category = document.getElementById("newsCategory")?.value;
    let date = document.getElementById("newsDate")?.value;
    let desc = document.getElementById("newsDescription")?.value;
    let fileInput = document.getElementById("newsImage")?.files[0];

    if(!title || !desc) return showFighterNotification("টাইটেল এবং বিবরণ লিখুন!", "warning");

    if(fileInput) {
        let reader = new FileReader();
        reader.onload = function(e) {
            saveNewsToFirebase(title, category, date, desc, e.target.result);
        };
        reader.readAsDataURL(fileInput);
    } else {
        saveNewsToFirebase(title, category, date, desc, "");
    }
}

function saveNewsToFirebase(title, category, date, description, image) {
    let newNews = { title, category, date, description, image };
    fetch(FIREBASE_URL + "/news.json", {
        method: "POST",
        body: JSON.stringify(newNews)
    }).then(() => {
        loadNews();
        document.getElementById("newsTitle").value = "";
        document.getElementById("newsDescription").value = "";
        showFighterNotification("নিউজ সফলভাবে প্রকাশিত হয়েছে!", "success");
    });
}

// নিউজ রেন্ডার করা
function renderNews() {
    let container = document.getElementById("newsContainer");
    if(!container) return;
    container.innerHTML = "";

    if(newsData.length === 0) {
        container.innerHTML = `<p style="color:#94a3b8; text-align:center;">কোনো নিউজ পাওয়া যায়নি।</p>`;
        return;
    }

    newsData.reverse().forEach(item => {
        container.innerHTML += `
            <div class="news-card" style="background:rgba(255,255,255,0.05); padding:15px; border-radius:12px; margin-bottom:15px;">
                ${item.image ? `<img src="${item.image}" style="width:100%; height:200px; object-fit:cover; border-radius:8px; margin-bottom:10px;">` : ''}
                <span style="background:var(--primary); color:#fff; padding:2px 8px; border-radius:4px; font-size:12px;">${item.category || 'Match'}</span>
                <h3 style="margin:8px 0;">${item.title}</h3>
                <p style="color:#94a3b8; font-size:14px;">${item.description}</p>
                <small style="color:#64748b;">📅 ${item.date || ''}</small>
            </div>`;
    });
}
// ছবি ছোট করার হেলপার ফাংশন
function compressImage(file, callback) {
    let reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function (event) {
        let img = new Image();
        img.src = event.target.result;
        img.onload = function () {
            let canvas = document.createElement("canvas");
            let MAX_WIDTH = 800; // ছবির সর্বোচ্চ ওয়াইড ৮০০ পিক্সেল
            let scaleFactor = MAX_WIDTH / img.width;
            
            if (scaleFactor < 1) {
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleFactor;
            } else {
                canvas.width = img.width;
                canvas.height = img.height;
            }

            let ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // 0.7 দিয়ে কোয়ালিটি ৭০% এ নিয়ে আসা হচ্ছে যাতে সাইজ অনেক কমে যায়
            let compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7); 
            callback(compressedDataUrl);
        };
    };
}
function uploadPhoto() {
    let fileInput = document.getElementById("galFile")?.files[0];
    let caption = document.getElementById("galCaption")?.value.trim();
    let album = document.getElementById("galAlbum")?.value || "Match";
    
    if(!fileInput || !caption) {
        return showFighterNotification("ছবি এবং ক্যাপশন দুটিই প্রদান করুন!", "warning");
    }

    // ছবি কম্প্রেস করে সেভ করা
    compressImage(fileInput, function(compressedBase64) {
        let newPhoto = { url: compressedBase64, title: caption, album: album };
        
        fetch(FIREBASE_URL + "/gallery.json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newPhoto)
        })
        .then(res => {
            if(!res.ok) throw new Error("Firebase error");
            return res.json();
        })
        .then(() => {
            loadGallery();
            document.getElementById("galFile").value = "";
            document.getElementById("galCaption").value = "";
            showFighterNotification("ছবি সফলভাবে সেভ হয়েছে!", "success");
        })
        .catch(err => {
            console.error(err);
            showFighterNotification("ফায়ারবেজে ডাটা সেভ হতে সমস্যা হয়েছে!", "error");
        });
    });
}