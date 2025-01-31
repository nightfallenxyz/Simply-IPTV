module.exports = (req, res) => {
  const url = req.query.url;
  fetch(url)
    .then(response => response.text())
    .then(data => res.send(data))
    .catch(error => res.status(500).send(error.message));
};
