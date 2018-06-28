
function NewsItem(url, from, newsId, pt, sortId, title, content) {
	this.url = url
	this.from = from
	this.newsId = newsId
	this.time = pt
	this.sortId = sortId
	this.title = title
	this.content = content

	function formatTime(pt) {
		// 2015-10-19 13:21:00.000  -->  02-13
		var time = pt

		time = time.substr(5, 5)

		return time
	}
}

module.exports = NewsItem
