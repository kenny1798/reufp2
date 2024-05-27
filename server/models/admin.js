module.exports = (sequelize, DataTypes) => {

    const admin = sequelize.define("admin", {
        token: {
            type: DataTypes.STRING,
            allowNull: false
        },
        text: {
            type: DataTypes.STRING(10000),
            allowNull: true
        },
    })

    return admin
}