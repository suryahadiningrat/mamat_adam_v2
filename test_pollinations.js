const url = "https://image.pollinations.ai/prompt/cat?width=512&height=512&nologo=true";
fetch(url).then(res => {
  console.log("Status:", res.status);
  console.log("Type:", res.headers.get("content-type"));
  process.exit(0);
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
