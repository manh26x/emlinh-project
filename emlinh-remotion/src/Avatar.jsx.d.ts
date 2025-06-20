import React from 'react';
import type { GroupProps } from '@react-three/fiber';

// Nếu Avatar có thêm các props tùy chỉnh riêng, bạn có thể định nghĩa chúng ở đây
// interface AvatarSpecificProps {
//   myCustomProp?: string;
// }

// Và kết hợp chúng: type AllAvatarProps = GroupProps & AvatarSpecificProps;
// Hiện tại, nếu Avatar chỉ truyền props xuống group, thì GroupProps là đủ.

declare const Avatar: React.FC<GroupProps>;
export { Avatar };
