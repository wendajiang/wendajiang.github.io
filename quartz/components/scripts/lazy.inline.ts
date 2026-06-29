import lozad from "lozad"

document.addEventListener("nav", () => {
  const observer = lozad(".lazy")
  observer.observe()
})
