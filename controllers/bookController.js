var Book = require("../models/book");
var Author = require("../models/author");
var Genre = require("../models/genre");
var BookInstance = require("../models/bookinstance");

var async = require("async");
const { body, validationResult } = require("express-validator");

// count all elements
exports.index = function (req, res) {
	async.parallel(
		{
			book_count(callback) {
				Book.countDocuments({}, callback); // Pass an empty object as match condition to find all documents of this collection
			},
			book_instance_count(callback) {
				BookInstance.countDocuments({}, callback);
			},
			book_instance_available_count(callback) {
				BookInstance.countDocuments({ status: "Available" }, callback);
			},
			author_count(callback) {
				Author.countDocuments({}, callback);
			},
			genre_count(callback) {
				Genre.countDocuments({}, callback);
			},
		},
		function (err, results) {
			res.render("index", {
				title: "Local Library Home",
				error: err,
				data: results,
			});
		}
	);
};

// Display list of all Books.
exports.book_list = function (req, res, next) {
	Book.find({}, "title author")
		.sort({ title: 1 })
		.populate("author")
		.exec(function (err, list_books) {
			if (err) {
				return next(err);
			}
			//Successful, so render
			res.render("book_list", {
				title: "Book List",
				book_list: list_books,
			});
		});
};

// Display detail page for a specific book.
exports.book_detail = function (req, res, next) {
	async.parallel(
		{
			book(callback) {
				Book.findById(req.params.id)
					.populate("author")
					.populate("genre")
					.exec(callback);
			},
			book_instance(callback) {
				BookInstance.find({ book: req.params.id }).exec(callback);
			},
		},
		function (err, results) {
			if (err) {
				return next(err);
			}
			if (results.book == null) {
				// No results.
				var err = new Error("Book not found");
				err.status = 404;
				return next(err);
			}
			// Successful, so render.
			res.render("book_detail", {
				title: results.book.title,
				book: results.book,
				book_instances: results.book_instance,
			});
		}
	);
};

// Display book create form on GET.
exports.book_create_get = (req, res, next) => {
	// Get all authors and genres, which we can use for adding to our book.
	async.parallel(
		{
			authors(callback) {
				Author.find(callback);
			},
			genres(callback) {
				Genre.find(callback);
			},
		},
		(err, results) => {
			if (err) {
				return next(err);
			}
			res.render("book_form", {
				title: "Create Book",
				authors: results.authors,
				genres: results.genres,
			});
		}
	);
};

// Handle book create on POST.
exports.book_create_post = [
	// Convert the genre to an array.
	(req, res, next) => {
		if (!Array.isArray(req.body.genre)) {
			req.body.genre =
				typeof req.body.genre === "undefined" ? [] : [req.body.genre];
		}
		next();
	},

	// Validate and sanitize fields.
	body("title", "Title must not be empty.")
		.trim()
		.isLength({ min: 1 })
		.escape(),
	body("author", "Author must not be empty.")
		.trim()
		.isLength({ min: 1 })
		.escape(),
	body("summary", "Summary must not be empty.")
		.trim()
		.isLength({ min: 1 })
		.escape(),
	body("isbn", "ISBN must not be empty").trim().isLength({ min: 1 }).escape(),
	body("genre.*").escape(),

	// Process request after validation and sanitization.
	(req, res, next) => {
		// Extract the validation errors from a request.
		const errors = validationResult(req);

		// Create a Book object with escaped and trimmed data.
		const book = new Book({
			title: req.body.title,
			author: req.body.author,
			summary: req.body.summary,
			isbn: req.body.isbn,
			genre: req.body.genre,
		});

		if (!errors.isEmpty()) {
			// There are errors. Render form again with sanitized values/error messages.

			// Get all authors and genres for form.
			async.parallel(
				{
					authors(callback) {
						Author.find(callback);
					},
					genres(callback) {
						Genre.find(callback);
					},
				},
				(err, results) => {
					if (err) {
						return next(err);
					}

					// Mark our selected genres as checked.
					for (const genre of results.genres) {
						if (book.genre.includes(genre._id)) {
							genre.checked = "true";
						}
					}
					res.render("book_form", {
						title: "Create Book",
						authors: results.authors,
						genres: results.genres,
						book,
						errors: errors.array(),
					});
				}
			);
			return;
		}

		// Data from form is valid. Save book.
		book.save((err) => {
			if (err) {
				return next(err);
			}

			// Successful: redirect to new book record.
			res.redirect(book.url);
		});
	},
];

// Display book delete form on GET.
exports.book_delete_get = function (req, res) {
	res.send("NOT IMPLEMENTED: Book delete GET");
};

// Handle book delete on POST.
exports.book_delete_post = function (req, res) {
	res.send("NOT IMPLEMENTED: Book delete POST");
};

// Display book update form on GET.
exports.book_update_get = function (req, res) {
	res.send("NOT IMPLEMENTED: Book update GET");
};

// Handle book update on POST.
exports.book_update_post = function (req, res) {
	res.send("NOT IMPLEMENTED: Book update POST");
};
