module.exports = (sequelize, DataTypes) => {

    const holidays = sequelize.define("holidays", {
        holidayDate: {
            type: DataTypes.DATE,
            allowNull: false
        },
    })

    return holidays
}