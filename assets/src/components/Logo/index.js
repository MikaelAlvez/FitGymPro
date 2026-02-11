import React from 'react';
import { View, Text, Image } from 'react-native';
import styles from './styles';

const Logo = ({ size = 'large' }) => {
  const containerStyle = size === 'large' ? styles.containerLarge : 
                        size === 'medium' ? styles.containerMedium : 
                        styles.containerSmall;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, containerStyle]}>
        <Image 
          source={require('../image/logo.png')} 
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.brandName}>FitGym</Text>
    </View>
  );
};

export default Logo;