export const errorHandler = (err, req, res, next) => {
    console.error("Error in request:", err.message);
    return res.status(err.status || 500).json({
        status: false,
        message: err.message || " Something went wrong please try again later",
    });
}