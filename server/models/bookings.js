module.exports = (sequelize, DataTypes) => {

    const bookings = sequelize.define("bookings", {
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false
        },
        phoneNumber: {
            type: DataTypes.STRING,
            allowNull: false
        },
        bookingDate: {
            type: DataTypes.DATE,
            allowNull: false
        },
        bookingTime: {
            type: DataTypes.STRING,
            allowNull: false
        },
        bookingPax: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        billId: {
            type: DataTypes.STRING,
            allowNull: false
        },
    })

    return bookings
}